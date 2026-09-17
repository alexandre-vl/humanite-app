import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { CACHE_BUSTER } from './cache-buster';
import { mmkvPersister } from './persister';

/** How long a persisted cache stays valid; the query gcTime matches it, so gcTime never falls below the persister maxAge. */
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

/** The app's single QueryClient: its cache is persisted to MMKV and restored at startup. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: CACHE_MAX_AGE } },
});

/** The persistence options the provider applies: the MMKV persister, the contracts-hash buster, and the max cache age. */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: mmkvPersister,
  buster: CACHE_BUSTER,
  maxAge: CACHE_MAX_AGE,
};
