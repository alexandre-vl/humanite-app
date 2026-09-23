import { createRemoteApi } from '@huma/remote-api';
import { noteSetAside } from './set-aside';
import type { Source } from './source';

/**
 * The journal's service, in the place of the corpus: the variant of `source.ts` a build reading the service bundles.
 *
 * It asks through the platform's own network — its `fetch`, its abort and its timers, which the client is handed
 * rather than reaching for. Cookies are left out: the service sets none the app needs, and a request that sent one
 * would speak for a session this app never opened. It draws no picture of the corpus, which this build does not carry
 * and which nothing the service sends can name.
 */
export const SOURCE: Source = {
  name: 'service',
  content: createRemoteApi<AbortSignal>({
    fetch: async (address, init) => {
      const reply = await fetch(address, { headers: init.headers, signal: init.signal, credentials: 'omit' });
      return { status: reply.status, text: async () => reply.text() };
    },
    abortable: () => new AbortController(),
    after: (delay, then) => {
      const timer = setTimeout(then, delay);
      return () => {
        clearTimeout(timer);
      };
    },
    setAside: noteSetAside,
  }),
  corpusPicture: () => null,
};
