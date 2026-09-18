import type { DehydratedState } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS, storage } from '#lib/storage';

/** Whether one field of a restored object is what its type claims. */
type Holds = (value: unknown) => boolean;

const holdsEvery = (value: unknown, fields: Readonly<Record<string, Holds>>): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Object.entries(fields).every(([name, holds]) => holds(Reflect.get(value, name)));

/** What a dehydrated cache holds, keyed exhaustively: a field the library adds stops compiling here until it is checked. */
const STATE_FIELDS = {
  mutations: (value) => Array.isArray(value),
  queries: (value) => Array.isArray(value),
} satisfies Readonly<Record<keyof DehydratedState, Holds>>;

/** What a persisted client holds, keyed exhaustively for the same reason. */
const CLIENT_FIELDS = {
  timestamp: (value) => typeof value === 'number',
  buster: (value) => typeof value === 'string',
  clientState: (value) => holdsEvery(value, STATE_FIELDS),
} satisfies Readonly<Record<keyof PersistedClient, Holds>>;

/**
 * Whether what came back from the disk is still a persisted cache. The buster already drops a cache the contracts have
 * outgrown; this refuses the other case, bytes that no longer parse as the shape the library will hydrate.
 */
const isPersistedClient = (value: unknown): value is PersistedClient => holdsEvery(value, CLIENT_FIELDS);

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
