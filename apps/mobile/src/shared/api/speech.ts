import { isRecord } from '@huma/unknown';
import { saveSpeech } from '../lib/speech';
import { READER } from './reader';
import type { Reader } from './reader';

const ROOT = 'https://audio-humanite.alexvl.fr';
type Recording = Readonly<{ uri: string; duration: number }>;
export type SpeechSession = Readonly<{
  speak: (text: string, signal: AbortSignal) => Promise<Recording>;
  close: () => Promise<void>;
}>;
type Ports = Readonly<{
  request: typeof fetch;
  reader: Pick<Reader, 'token' | 'renew' | 'reopen' | 'signOut'>;
  save: (bytes: Uint8Array, duration: number) => Recording;
}>;

function job(value: unknown): Readonly<{ ticket: string; duration: number | null }> {
  if (
    !isRecord(value) ||
    typeof value['ticket'] !== 'string' ||
    !/^[\w.-]{1,1024}$/u.test(value['ticket']) ||
    (value['status'] !== 'ready' && value['status'] !== 'queued')
  ) {
    throw new Error('Invalid audio job');
  }
  const duration = value['duration'];
  if (
    value['status'] === 'ready' &&
    (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > 90)
  ) {
    throw new Error('Invalid audio duration');
  }
  return {
    ticket: value['ticket'],
    duration: value['status'] === 'ready' && typeof duration === 'number' ? duration : null,
  };
}

async function pause(signal: AbortSignal, delay = 600): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      reject(new Error('Audio cancelled'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delay);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
    }
  });
}

/** A bounded session: the reader's credential only travels to our fixed article endpoint. */
export function createSpeech(article: string, ports: Ports): SpeechSession {
  if (!/^\d+$/u.test(article)) {
    throw new Error('Audio requires an article from the journal');
  }
  const session = new AbortController();
  return {
    close: async () => {
      session.abort();
      await Promise.resolve();
    },
    speak: async (text, parent) => {
      const controller = new AbortController();
      const abort = (): void => {
        controller.abort();
      };
      parent.addEventListener('abort', abort, { once: true });
      session.signal.addEventListener('abort', abort, { once: true });
      const expires = Date.now() + 120_000;
      const timer = setTimeout(abort, 120_000);
      if (parent.aborted || session.signal.aborted) {
        abort();
      }
      const signal = controller.signal;
      const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
        while (!signal.aborted && Date.now() < expires) {
          const response = await ports.request(ROOT + path, {
            ...init,
            signal,
            credentials: 'omit',
            redirect: 'error',
          });
          if (response.status !== 429 && response.status !== 502 && response.status !== 503) {
            return response;
          }
          const seconds = Number(response.headers.get('retry-after') ?? '1');
          await pause(signal, Number.isFinite(seconds) ? Math.min(5000, Math.max(600, seconds * 1000)) : 1000);
        }
        throw new Error('Audio cancelled');
      };
      const submit = async (retry: boolean): Promise<ReturnType<typeof job>> => {
        const token = ports.reader.token();
        const response = await request(`/v1/articles/${article}/segments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ text }),
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
        if (token !== undefined && renewed !== null && !signal.aborted) {
          ports.reader.renew(token, renewed);
        }
        return job(await response.json());
      };
      try {
        let current = await submit(true);
        let restarted = false;
        while (current.duration === null) {
          const response = await request(`/v1/jobs/${current.ticket}?wait=20`);
          if (response.status === 410 && !restarted) {
            restarted = true;
            current = await submit(true);
            continue;
          }
          if (!response.ok) {
            throw new Error('Audio preparation failed');
          }
          const data: unknown = await response.json();
          current = job(isRecord(data) ? { ...data, ticket: current.ticket } : data);
        }
        const response = await request(`/v1/audio/${current.ticket}`);
        if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'audio/wav') {
          throw new Error('Invalid audio response');
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (signal.aborted || Date.now() >= expires || bytes.length < 44 || bytes.length > 5_000_000) {
          throw new Error('Invalid audio download');
        }
        return ports.save(bytes, current.duration);
      } finally {
        clearTimeout(timer);
        parent.removeEventListener('abort', abort);
        session.signal.removeEventListener('abort', abort);
      }
    },
  };
}

export const openSpeech = (article: string): SpeechSession =>
  createSpeech(article, { request: fetch, reader: READER, save: saveSpeech });
