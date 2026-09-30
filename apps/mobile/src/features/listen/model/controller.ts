import type { Article, DisplayText } from '@huma/contracts';
import type { SpeechProgress, SpeechSession } from '#api';

export type Passage = Readonly<{ text: string; heading: boolean }>;
export type Playback = Readonly<{
  position: number;
  duration: number;
  playing: boolean;
  finished: boolean;
  loaded: boolean;
  buffering: boolean;
  error: boolean;
}>;
type Player = Readonly<{
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => Promise<void>;
  rate: (speed: number) => void;
  close: () => void;
}>;
type Stage = 'idle' | 'intro' | 'preparing' | 'reconnecting' | 'playing' | 'paused' | 'ended' | 'failed';
export type Listening = Readonly<{
  article: Article | null;
  passages: readonly Passage[];
  index: number;
  position: number;
  duration: number;
  stage: Stage;
  expanded: boolean;
  speed: number;
  prepared: number;
  error: 'speech' | null;
  complete: boolean;
  cues: SpeechProgress['cues'];
}>;
type Controller = Readonly<{
  select: (article: Article, passages: readonly Passage[]) => void;
  begin: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  jump: (index: number) => void;
  toggle: () => void;
  speed: () => void;
  expand: (expanded: boolean) => void;
}>;
const cancelled = (signal: AbortSignal): boolean => signal.aborted;
export type Resume = Readonly<{ key: string; seconds: number }>;
export type ListeningPorts = Readonly<{
  consented: () => boolean;
  engine: (article: Article) => Promise<SpeechSession>;
  releaseAudio: () => void;
  player: (uri: string, title: DisplayText, update: (status: Playback) => void) => Promise<Player>;
  resume: () => Resume | null;
  remember: (resume: Resume) => void;
}>;
export const EMPTY_LISTENING: Listening = {
  article: null,
  passages: [],
  index: 0,
  position: 0,
  duration: 0,
  stage: 'idle',
  expanded: false,
  speed: 1,
  prepared: 0,
  error: null,
  complete: false,
  cues: [],
};
export function readingKey(article: Article, passages: readonly Passage[]): string {
  let hash = 2166136261;
  for (const character of passages.map((passage) => passage.text).join('\n')) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619);
  }
  return `${article.id}:${String(hash >>> 0)}`;
}

/** A single native timeline. Paragraph changes never load, pause or replace audio. */
export function createListening(ports: ListeningPorts, changed: (state: Listening) => void): Controller {
  let state = EMPTY_LISTENING;
  let session = new AbortController();
  let engine: SpeechSession | null = null;
  let player: Player | null = null;
  let wanted = false;
  let opening = false;
  let key = '';
  let resumeAt = 0;
  let retries = 0;
  let resumedAt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let recoveryDeadline: ReturnType<typeof setTimeout> | null = null;
  const clearRecovery = (): void => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (recoveryDeadline !== null) {
      clearTimeout(recoveryDeadline);
      recoveryDeadline = null;
    }
  };
  const update = (patch: Partial<Listening>): void => {
    state = { ...state, ...patch };
    changed(state);
  };
  const remember = (): void => {
    if (state.article !== null) {
      ports.remember({ key, seconds: opening ? Math.max(resumeAt, state.position) : state.position });
    }
  };
  const release = (): void => {
    session.abort();
    engine?.close();
    engine = null;
    player?.close();
    player = null;
    ports.releaseAudio();
    opening = false;
  };
  const fail = (signal: AbortSignal, recoverable = false): void => {
    if (!cancelled(signal)) {
      if (opening && resumeAt > state.position) {
        update({ position: resumeAt });
      }
      remember();
      release();
      if (recoverable && wanted && retries < 10) {
        resumeAt = state.position;
        session = new AbortController();
        const retrySignal = session.signal;
        recoveryDeadline ??= setTimeout(() => {
          fail(session.signal);
        }, 60000);
        update({ stage: 'reconnecting', error: null });
        retryTimer = setTimeout(
          () => {
            retryTimer = null;
            if (!cancelled(retrySignal) && wanted) {
              begin();
            }
          },
          Math.min(8000, 1000 * 2 ** Math.min(retries++, 3)),
        );
        return;
      }
      clearRecovery();
      wanted = false;
      update({ stage: 'failed', error: 'speech' });
    }
  };
  const seek = (seconds: number): void => {
    if (player === null || !Number.isFinite(seconds)) {
      return;
    }
    const position = Math.max(0, Math.min(state.duration, seconds));
    const signal = session.signal;
    void player
      .seek(position)
      .then(() => {
        if (!cancelled(signal)) {
          update({ position });
          remember();
        }
      })
      .catch(() => {
        fail(signal);
      });
  };
  const begin = (): void => {
    const article = state.article;
    if (article === null || opening) {
      return;
    }
    if (state.stage === 'failed') {
      retries = 0;
      resumeAt = state.position;
    }
    if (player !== null) {
      wanted = true;
      player.play();
      return;
    }
    session = new AbortController();
    const signal = session.signal;
    wanted = true;
    opening = true;
    update({ stage: recoveryDeadline === null ? 'preparing' : 'reconnecting', error: null });
    let resumeReady: (() => void) | null = null;
    const progress = (value: SpeechProgress): void => {
      if (!cancelled(signal)) {
        update({ complete: value.complete, cues: value.cues, prepared: value.cues.length, duration: value.duration });
        resumeReady?.();
      }
    };
    const prepare = async (): Promise<void> => {
      const opened = await ports.engine(article);
      if (cancelled(signal)) {
        opened.close();
        return;
      }
      engine = opened;
      const uri = await opened.open(
        state.passages.map((passage) => passage.text),
        signal,
        progress,
        () => {
          if (opening) {
            fail(signal, recoveryDeadline !== null);
          }
        },
      );
      if (cancelled(signal)) {
        return;
      }
      let hasPlayed = false;
      const native = await ports.player(uri, article.title, (status) => {
        if (cancelled(signal)) {
          return;
        }
        if (status.error) {
          fail(signal, hasPlayed || recoveryDeadline !== null);
          return;
        }
        if (status.finished) {
          clearRecovery();
          retries = 0;
          wanted = false;
          update({ stage: 'ended', position: Math.max(state.duration, status.position), complete: true });
          remember();
          return;
        }
        if (status.buffering) {
          update({ stage: wanted ? (recoveryDeadline === null ? 'preparing' : 'reconnecting') : 'paused' });
          return;
        }
        if (!status.loaded || opening) {
          return;
        }
        if (status.playing) {
          if (recoveryDeadline !== null) {
            clearRecovery();
            resumedAt = status.position;
          }
          if (status.position - resumedAt >= 10) {
            retries = 0;
          }
          hasPlayed = true;
          wanted = true;
        } else if (hasPlayed) {
          wanted = false;
        }
        const index = state.cues.findLast((cue) => cue.start <= status.position)?.index ?? 0;
        update({
          position: status.position,
          index,
          duration: Math.max(state.duration, status.duration),
          stage: status.playing
            ? 'playing'
            : wanted
              ? recoveryDeadline === null
                ? 'preparing'
                : 'reconnecting'
              : 'paused',
        });
        remember();
      });
      if (cancelled(signal)) {
        native.close();
        return;
      }
      player = native;
      native.rate(state.speed);
      // Never silently restart at zero when a saved position is still being generated.
      if (resumeAt > state.duration && !state.complete) {
        await new Promise<void>((resolve, reject) => {
          const abort = (): void => {
            resumeReady = null;
            reject(new Error('Audio cancelled'));
          };
          resumeReady = (): void => {
            if (state.duration >= resumeAt || state.complete) {
              signal.removeEventListener('abort', abort);
              resumeReady = null;
              resolve();
            }
          };
          signal.addEventListener('abort', abort, { once: true });
          if (cancelled(signal)) {
            abort();
          } else {
            resumeReady();
          }
        });
      }
      if (resumeAt > 0) {
        await native.seek(Math.min(resumeAt, state.duration));
      }
      if (cancelled(signal)) {
        native.close();
        return;
      }
      opening = false;
      if (wanted) {
        native.play();
      } else {
        update({ stage: 'paused' });
      }
    };
    void prepare().catch(() => {
      fail(signal, recoveryDeadline !== null);
    });
  };
  const stop = (): void => {
    clearRecovery();
    retries = 0;
    remember();
    wanted = false;
    release();
    update({ ...EMPTY_LISTENING, speed: state.speed });
  };
  const jump = (index: number): void => {
    if (!Number.isFinite(index)) {
      return;
    }
    const cue = state.cues[Math.max(0, Math.min(state.cues.length - 1, Math.floor(index)))];
    if (cue !== undefined) {
      seek(cue.start);
    }
  };
  return {
    select: (article: Article, passages: readonly Passage[]): void => {
      if (article.body.kind !== 'open' || passages.length === 0) {
        return;
      }
      const nextKey = readingKey(article, passages);
      if (key === nextKey && state.article !== null) {
        update({ expanded: true });
        return;
      }
      stop();
      key = nextKey;
      const resume = ports.resume();
      resumeAt = resume?.key === key ? resume.seconds : 0;
      update({ article, passages, expanded: true, stage: 'intro' });
      if (ports.consented()) {
        begin();
      }
    },
    begin,
    stop,
    seek,
    jump,
    toggle: (): void => {
      if (state.stage === 'intro') {
        update({ expanded: true });
        return;
      }
      if (state.stage === 'failed') {
        begin();
        return;
      }
      if (recoveryDeadline !== null) {
        clearRecovery();
        remember();
        release();
        wanted = false;
        update({ stage: 'paused' });
        return;
      }
      if (state.stage === 'paused' && player === null) {
        retries = 0;
        resumeAt = state.position;
        begin();
        return;
      }
      if (state.stage === 'ended') {
        seek(0);
        wanted = true;
        player?.play();
        return;
      }
      wanted = !wanted;
      if (wanted) {
        update({ stage: 'preparing' });
        player?.play();
      } else {
        player?.pause();
        update({ stage: 'paused' });
      }
    },
    speed: (): void => {
      const speeds = [0.8, 1, 1.15, 1.3, 1.5];
      const speed = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length] ?? 1;
      player?.rate(speed);
      update({ speed });
    },
    expand: (expanded: boolean): void => {
      update({ expanded });
    },
  };
}
