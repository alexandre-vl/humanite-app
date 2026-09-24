import { isList, isRecord } from '@huma/unknown';
import type { DehydratedState } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS, storage } from '#lib/storage';

/** Whether one field of a restored object is what its type claims. */
type Holds = (value: unknown) => boolean;

const holdsEvery = (value: unknown, fields: Readonly<Record<string, Holds>>): boolean =>
  isRecord(value) && Object.entries(fields).every(([name, holds]) => holds(value[name]));

/** What a dehydrated cache holds, keyed exhaustively: a field the library adds stops compiling here until it is checked. */
const STATE_FIELDS = {
  mutations: isList,
  queries: isList,
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

/**
 * How long the persister waits before writing again, in milliseconds. The provider asks for a write on every cache
 * event, and a scrolled wire produces a burst of them: each one would serialise the whole cache — every page of every
 * feed already read — and block the thread on a write, so the writes grow as fast as the reasons to write. One a
 * second keeps the disk close to the cache without paying for each step of a scroll.
 */
const WRITE_PERIOD = 1000;

/** The last cache asked for while the door was shut, which reopening writes. */
let pending: PersistedClient | undefined;

/** The timer that reopens the door, or `undefined` when the next ask may write at once. */
let door: ReturnType<typeof setTimeout> | undefined;

const write = (client: PersistedClient): void => {
  storage.set(STORAGE_KEYS.queryCache, JSON.stringify(client));
};

const openDoor = (): void => {
  const last = pending;
  pending = undefined;
  if (last === undefined) {
    door = undefined;
    return;
  }
  write(last);
  door = setTimeout(openDoor, WRITE_PERIOD);
};

/**
 * Persists the TanStack Query cache to MMKV, synchronously: the cache is present at the first render, not after a
 * promise. A write goes through at once, then holds the door for `WRITE_PERIOD`; whatever is asked for meanwhile is
 * kept and written as the door opens, so no state is lost and none is written twice. Removing the cache drops what
 * was waiting: a write that outlived its removal would put the file back.
 */
export const mmkvPersister: Persister = {
  persistClient: (client) => {
    if (door !== undefined) {
      pending = client;
      return;
    }
    write(client);
    door = setTimeout(openDoor, WRITE_PERIOD);
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
    pending = undefined;
    if (door !== undefined) {
      clearTimeout(door);
      door = undefined;
    }
    storage.forget(STORAGE_KEYS.queryCache);
  },
};
