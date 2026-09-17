import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS, storage } from '#lib/storage';

const isPersistedClient = (value: unknown): value is PersistedClient => typeof value === 'object' && value !== null;

/** Persists the TanStack Query cache to MMKV, synchronously: the cache is present at the first render, not after a promise. */
export const mmkvPersister: Persister = {
  persistClient: (client) => {
    storage.set(STORAGE_KEYS.queryCache, JSON.stringify(client));
  },
  restoreClient: () => {
    const raw = storage.getString(STORAGE_KEYS.queryCache);
    if (raw === undefined) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    return isPersistedClient(parsed) ? parsed : undefined;
  },
  removeClient: () => {
    storage.remove(STORAGE_KEYS.queryCache);
  },
};
