import type { Article, DisplayText } from '@huma/contracts';
import type { SpeechSession } from '#api';

export type Passage = Readonly<{ text: string; heading: boolean }>;
type Recording = Readonly<{ uri: string; duration: number }>;
export type Playback = Readonly<{
  position: number;
  duration: number;
  playing: boolean;
  finished: boolean;
  loaded: boolean;
}>;
type Player = Readonly<{
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => Promise<void>;
  rate: (speed: number) => void;
  close: () => void;
}>;
type Stage = 'idle' | 'intro' | 'preparing' | 'playing' | 'paused' | 'ended' | 'failed';
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
}>;
export type Resume = Readonly<{ key: string; index: number; seconds: number }>;
export type ListeningPorts = Readonly<{
  consented: () => boolean;
  engine: (article: Article) => Promise<SpeechSession>;
  clear: () => void;
  releaseAudio: () => void;
  player: (recording: Recording, title: DisplayText, update: (status: Playback) => void) => Promise<Player>;
  resume: () => Resume | null;
  remember: (resume: Resume) => void;
}>;
const cancelled = (signal: AbortSignal): boolean => signal.aborted;
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
};

/** Content identity, not a security hash: changed words invalidate an old reading position. */
export function readingKey(article: Article, passages: readonly Passage[]): string {
  let hash = 2166136261;
  for (const character of passages.map((passage) => passage.text).join('\n')) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619);
  }
  return `${article.id}:${String(hash >>> 0)}`;
}

/** One owner for downloads, generation and playback. Each session can invalidate every late asynchronous answer. */
export function createListening(
  ports: ListeningPorts,
  changed: (state: Listening) => void,
): Readonly<{
  select: (article: Article, passages: readonly Passage[]) => void;
  begin: () => void;
  toggle: () => void;
  jump: (index: number) => void;
  seek: (seconds: number) => void;
  speed: () => void;
  expand: (expanded: boolean) => void;
  stop: () => void;
}> {
  let state = EMPTY_LISTENING;
  let session = new AbortController();
  let engine: SpeechSession | null = null;
  let player: Player | null = null;
  let recordings = new Map<number, Recording>();
  let wanted = false;
  let running: Promise<void> | null = null;
  let loading = false;
  let playbackVersion = 0;
  let key = '';
  const update = (patch: Partial<Listening>): void => {
    state = { ...state, ...patch };
    changed(state);
  };
  const remember = (): void => {
    if (state.article !== null) {
      ports.remember({ key, index: state.index, seconds: state.position });
    }
  };
  const closePlayer = (): void => {
    playbackVersion += 1;
    player?.close();
    player = null;
    loading = false;
  };
  const fail = (signal: AbortSignal, error: 'speech'): void => {
    if (!cancelled(signal)) {
      wanted = false;
      closePlayer();
      ports.releaseAudio();
      update({ stage: 'failed', error });
    }
  };
  const playCurrent = async (signal: AbortSignal): Promise<void> => {
    const recording = recordings.get(state.index);
    if (cancelled(signal) || recording === undefined || player !== null || loading) {
      return;
    }
    loading = true;
    const version = ++playbackVersion;
    let hasPlayed = false;
    const title = state.article?.title;
    if (title === undefined) {
      loading = false;
      return;
    }
    const position = Math.min(state.position, recording.duration);
    const opened = await ports.player(recording, title, (status) => {
      if (cancelled(signal) || version !== playbackVersion) {
        return;
      }
      if (status.finished) {
        remember();
        closePlayer();
        if (state.index + 1 >= state.passages.length) {
          wanted = false;
          update({ stage: 'ended', position: recording.duration });
          remember();
        } else {
          update({ index: state.index + 1, position: 0, duration: 0, stage: wanted ? 'preparing' : 'paused' });
          void playCurrent(signal).catch(() => {
            fail(signal, 'speech');
          });
          pump();
        }
        return;
      }
      if (!status.loaded || loading) {
        return;
      }
      // Native lock-screen controls and interruptions own playback too. A paused phone is never restarted by prefetch.
      if (status.playing) {
        hasPlayed = true;
        wanted = true;
      } else if (hasPlayed) {
        wanted = false;
      }
      update({
        position: status.position,
        duration: status.duration,
        stage: status.playing ? 'playing' : wanted ? 'preparing' : 'paused',
      });
      remember();
    });
    if (cancelled(signal) || version !== playbackVersion) {
      opened.close();
      return;
    }
    player = opened;
    opened.rate(state.speed);
    if (position > 0) {
      await opened.seek(position);
    }
    if (cancelled(signal) || version !== playbackVersion) {
      opened.close();
      return;
    }
    loading = false;
    update({ duration: recording.duration, stage: wanted ? 'playing' : 'paused' });
    if (wanted) {
      opened.play();
    }
  };
  const pump = (): void => {
    if (running !== null || engine === null || cancelled(session.signal)) {
      return;
    }
    const signal = session.signal;
    const synthesizer = engine;
    const work = async (): Promise<void> => {
      try {
        while (!cancelled(signal)) {
          const last = Math.min(state.passages.length - 1, state.index + (wanted ? 2 : 0));
          let next = state.index;
          while (next <= last && recordings.has(next)) {
            next += 1;
          }
          if (next > last) {
            break;
          }
          const passage = state.passages[next];
          if (passage === undefined) {
            break;
          }
          const audio = await synthesizer.speak(passage.text, signal);
          if (cancelled(signal)) {
            break;
          }
          recordings.set(next, audio);
          update({ prepared: recordings.size });
          await playCurrent(signal);
        }
        await playCurrent(signal);
      } catch {
        fail(signal, 'speech');
      }
    };
    running = work().finally(() => {
      running = null;
      if (cancelled(signal) && wanted) {
        pump();
      }
    });
  };
  const begin = (): void => {
    if (state.article === null || state.stage === 'preparing') {
      return;
    }
    wanted = true;
    if (engine !== null) {
      closePlayer();
      update({ stage: 'preparing', error: null });
      pump();
      return;
    }
    const signal = session.signal;
    const article = state.article;
    update({ stage: 'preparing', error: null });
    const prepare = async (): Promise<void> => {
      try {
        const opened = await ports.engine(article);
        if (cancelled(signal)) {
          await opened.close();
          return;
        }
        engine = opened;
        pump();
      } catch {
        fail(signal, 'speech');
      }
    };
    void prepare();
  };
  const stop = (): void => {
    remember();
    wanted = false;
    session.abort();
    closePlayer();
    ports.releaseAudio();
    const closing = engine;
    engine = null;
    const prior = running;
    if (closing !== null) {
      void (prior ?? Promise.resolve()).then(async () => closing.close()).catch(() => undefined);
    }
    recordings = new Map();
    ports.clear();
    update({ ...EMPTY_LISTENING, speed: state.speed });
  };
  const jump = (index: number): void => {
    if (!Number.isFinite(index) || state.passages.length === 0 || engine === null) {
      return;
    }
    remember();
    closePlayer();
    update({
      index: Math.max(0, Math.min(state.passages.length - 1, Math.floor(index))),
      position: 0,
      duration: 0,
      stage: wanted ? 'preparing' : 'paused',
    });
    remember();
    const signal = session.signal;
    void playCurrent(signal).catch(() => {
      fail(signal, 'speech');
    });
    pump();
  };
  return {
    select: (article, passages) => {
      if (article.body.kind !== 'open' || passages.length === 0) {
        return;
      }
      const nextKey = readingKey(article, passages);
      if (key === nextKey && state.article !== null) {
        update({ expanded: true });
        return;
      }
      stop();
      session = new AbortController();
      key = nextKey;
      const resume = ports.resume();
      const matching = resume?.key === key;
      update({
        article,
        passages,
        expanded: true,
        index: matching ? Math.min(passages.length - 1, resume.index) : 0,
        position: matching ? resume.seconds : 0,
        stage: 'intro',
      });
      if (ports.consented()) {
        begin();
      }
    },
    begin,
    toggle: () => {
      if (state.stage === 'intro') {
        update({ expanded: true });
        return;
      }
      if (state.stage === 'failed') {
        begin();
        return;
      }
      if (state.stage === 'ended') {
        wanted = true;
        jump(0);
        return;
      }
      wanted = !wanted;
      if (wanted) {
        update({ stage: player === null ? 'preparing' : 'playing' });
        player?.play();
        pump();
      } else {
        player?.pause();
        update({ stage: 'paused' });
        remember();
      }
    },
    jump,
    seek: (seconds) => {
      if (player === null || !Number.isFinite(seconds)) {
        return;
      }
      const position = Math.max(0, Math.min(state.duration, seconds));
      const signal = session.signal;
      const version = playbackVersion;
      void player
        .seek(position)
        .then(() => {
          if (!cancelled(signal) && version === playbackVersion) {
            update({ position });
            remember();
          }
        })
        .catch(() => {
          if (version === playbackVersion) {
            fail(signal, 'speech');
          }
        });
    },
    speed: () => {
      const speeds = [0.8, 1, 1.15, 1.3, 1.5];
      const speed = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length] ?? 1;
      player?.rate(speed);
      update({ speed });
    },
    expand: (expanded) => {
      update({ expanded });
    },
    stop,
  };
}
