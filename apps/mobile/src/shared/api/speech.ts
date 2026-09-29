import { isRecord, isList } from '@huma/unknown';
import { READER } from './reader';
import type { Reader } from './reader';

const cancelled = (signal: AbortSignal): boolean => signal.aborted;
const ROOT = 'https://audio-humanite.alexvl.fr';
export type SpeechProgress = Readonly<{
  complete: boolean;
  duration: number;
  cues: readonly Readonly<{ index: number; start: number }>[];
}>;
export type SpeechSession = Readonly<{
  open: (blocks: readonly string[], signal: AbortSignal, progress: (value: SpeechProgress) => void) => Promise<string>;
  close: () => void;
}>;
type Ports = Readonly<{
  request: typeof fetch;
  reader: Pick<Reader, 'token' | 'renew' | 'reopen' | 'signOut'>;
}>;

function progressOf(value: unknown, count: number): SpeechProgress {
  if (
    !isRecord(value) ||
    value['version'] !== 1 ||
    (value['state'] !== 'generating' && value['state'] !== 'complete') ||
    typeof value['duration'] !== 'number' ||
    !Number.isFinite(value['duration']) ||
    value['duration'] < 0 ||
    value['duration'] > 1800 ||
    !isList(value['cues']) ||
    value['cues'].length > count
  ) {
    throw new Error('Invalid audio progress');
  }
  let previous = -1;
  const cues = value['cues'].map((cue: unknown, index: number) => {
    if (
      !isRecord(cue) ||
      cue['index'] !== index ||
      typeof cue['start'] !== 'number' ||
      !Number.isFinite(cue['start']) ||
      cue['start'] < 0 ||
      cue['start'] < previous ||
      cue['start'] > Number(value['duration'])
    ) {
      throw new Error('Invalid audio cue');
    }
    previous = cue['start'];
    return { index, start: cue['start'] };
  });
  return { complete: value['state'] === 'complete', duration: value['duration'], cues };
}

/** Authorize once. Audio travels straight to the native player; JS only follows chapter metadata. */
export function createSpeech(article: string, ports: Ports): SpeechSession {
  if (!/^\d{1,12}$/u.test(article)) {
    throw new Error('Audio requires an article from the journal');
  }
  const session = new AbortController();
  return {
    close: () => {
      session.abort();
    },
    open: async (blocks, parent, progress) => {
      const abort = (): void => {
        session.abort();
      };
      parent.addEventListener('abort', abort, { once: true });
      if (parent.aborted) {
        abort();
      }
      const signal = session.signal;
      const request = async (
        path: string,
        init: RequestInit = {},
      ): Promise<Readonly<{ response: Response; value: unknown }>> => {
        if (cancelled(signal)) {
          throw new Error('Audio cancelled');
        }
        const controller = new AbortController();
        const cancel = (): void => {
          controller.abort();
        };
        signal.addEventListener('abort', cancel, { once: true });
        const timer = setTimeout(cancel, 25000);
        try {
          const response = await ports.request(ROOT + path, {
            ...init,
            signal: controller.signal,
            credentials: 'omit',
            redirect: 'error',
          });
          const value: unknown = response.ok ? await response.json() : null;
          if (cancelled(signal) || controller.signal.aborted) {
            throw new Error('Audio cancelled');
          }
          return { response, value };
        } finally {
          clearTimeout(timer);
          signal.removeEventListener('abort', cancel);
        }
      };
      const submit = async (retry: boolean): Promise<unknown> => {
        const token = ports.reader.token();
        const { response, value } = await request(`/v2/articles/${article}/listen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ blocks }),
        });
        if (response.status === 401 && token !== undefined && retry) {
          if (await ports.reader.reopen()) {
            return submit(false);
          }
          ports.reader.signOut();
        }
        if (!response.ok) {
          throw new Error('Audio request refused');
        }
        const renewed = response.headers.get('x-user-token');
        if (token !== undefined && renewed !== null && !cancelled(signal)) {
          ports.reader.renew(token, renewed);
        }
        return value;
      };
      try {
        const value = await submit(true);
        if (
          cancelled(signal) ||
          !isRecord(value) ||
          typeof value['ticket'] !== 'string' ||
          !/^[\w.-]{1,1024}$/u.test(value['ticket'])
        ) {
          throw new Error('Invalid audio session');
        }
        const ticket = value['ticket'];
        const first = progressOf(value, blocks.length);
        progress(first);
        const follow = async (): Promise<void> => {
          let current = first;
          let failures = 0;
          const backoff = async (): Promise<void> =>
            new Promise((resolve) => {
              const done = (): void => {
                clearTimeout(timer);
                signal.removeEventListener('abort', done);
                resolve();
              };
              const timer = setTimeout(done, Math.min(8000, 1000 * 2 ** Math.min(failures++, 3)));
              signal.addEventListener('abort', done, { once: true });
              if (cancelled(signal)) {
                done();
              }
            });
          while (!cancelled(signal) && !current.complete) {
            const next = await request(`/v2/streams/${ticket}/metadata?after=${String(current.cues.length)}`).catch(
              () => null,
            );
            if (cancelled(signal)) {
              return;
            }
            if (next === null || [429, 500, 502, 504].includes(next.response.status)) {
              await backoff();
              continue;
            }
            if (!next.response.ok) {
              return;
            }
            const parsed = progressOf(next.value, blocks.length);
            if (cancelled(signal)) {
              return;
            }
            current = parsed;
            failures = 0;
            progress(current);
          }
        };
        // Metadata failure must never interrupt already buffered native audio.
        void follow()
          .catch(() => undefined)
          .finally(() => {
            parent.removeEventListener('abort', abort);
          });
        return `${ROOT}/v2/streams/${ticket}/index.m3u8`;
      } catch (error) {
        parent.removeEventListener('abort', abort);
        throw error;
      }
    },
  };
}

export const openSpeech = (article: string): SpeechSession => createSpeech(article, { request: fetch, reader: READER });
