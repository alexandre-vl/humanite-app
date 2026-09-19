import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { isRetryable } from '#api';
import { isSearchKey } from '#entities/article';
import { CACHE_BUSTER } from './cache-buster';
import { mmkvPersister } from './persister';

const MINUTE = 1000 * 60;

/** How long a persisted cache stays valid; the query gcTime matches it, so gcTime never falls below the persister maxAge. */
const CACHE_MAX_AGE = 24 * 60 * MINUTE;

/**
 * How long a read stays fresh before a screen coming back to it asks again. Asking again for a paged feed asks for
 * every page already read, so a reader who leaves a wire scrolled deep and returns would pay the whole scroll over;
 * a newspaper publishes by the minute at most, so a minute of trust loses nothing and spares that.
 */
const FRESH_FOR = MINUTE;

/** How many times a read that may still pass is tried again before a screen says it failed. */
const RETRIES = 2;

/** The app's single QueryClient: its cache is persisted to MMKV and restored at startup. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_MAX_AGE,
      staleTime: FRESH_FOR,
      retry: (failureCount: number, error: Error) => failureCount < RETRIES && isRetryable(error),
    },
  },
});

/**
 * What of the cache is written to disk. A reading of the paper is worth keeping: the same pages will be wanted
 * tomorrow, and finding them already there is the whole point of persisting anything. A reader's question is not: it
 * is answered from the corpus the app already carries, it is asked once and rarely twice, and keeping it would file
 * every question ever typed beside the journal — and re-serialise them all on each of the next day's writes. It stays
 * in memory, where the reader still on the screen finds it, and goes no further.
 */
const isWorthKeeping = (query: Readonly<{ queryKey: readonly unknown[] }>): boolean => !isSearchKey(query.queryKey);

/** The persistence options the provider applies: the MMKV persister, the contracts-hash buster, and the max cache age. */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: mmkvPersister,
  buster: CACHE_BUSTER,
  maxAge: CACHE_MAX_AGE,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) && isWorthKeeping(query),
  },
};
