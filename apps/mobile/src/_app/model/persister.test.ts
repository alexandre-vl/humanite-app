import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { mmkvPersister } from './persister';

const CLIENT: PersistedClient = {
  timestamp: 0,
  buster: 'test',
  clientState: { mutations: [], queries: [] },
};

/** The same cache at a later moment: two asks the persister must tell apart. */
const later = (timestamp: number): PersistedClient => ({ ...CLIENT, timestamp });

/** Longer than the period the persister holds its door shut, so a waiting write goes through. */
const AFTER_THE_DOOR = 2000;

describe('mmkvPersister', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mmkvPersister.removeClient();
  });
  afterEach(() => {
    mmkvPersister.removeClient();
    jest.useRealTimers();
  });

  it('restaure le client persisté', async () => {
    await mmkvPersister.persistClient(CLIENT);
    expect(await mmkvPersister.restoreClient()).toStrictEqual(CLIENT);
  });

  it('oublie le client supprimé', async () => {
    await mmkvPersister.persistClient(CLIENT);
    await mmkvPersister.removeClient();
    expect(await mmkvPersister.restoreClient()).toBeUndefined();
  });

  it('refuse un cache dont la forme ne tient plus', async () => {
    storage.set(STORAGE_KEYS.queryCache, JSON.stringify({ ...CLIENT, clientState: { queries: [] } }));
    expect(await mmkvPersister.restoreClient()).toBeUndefined();
  });

  it('refuse un cache que rien ne date', async () => {
    storage.set(STORAGE_KEYS.queryCache, JSON.stringify({ buster: 'test', clientState: CLIENT.clientState }));
    expect(await mmkvPersister.restoreClient()).toBeUndefined();
  });

  it('n’écrit qu’une fois une rafale de demandes, et retient la dernière', async () => {
    await mmkvPersister.persistClient(later(1));
    await mmkvPersister.persistClient(later(2));
    await mmkvPersister.persistClient(later(3));
    expect(await mmkvPersister.restoreClient()).toStrictEqual(later(1));
    jest.advanceTimersByTime(AFTER_THE_DOOR);
    expect(await mmkvPersister.restoreClient()).toStrictEqual(later(3));
  });

  it('ne remet pas en place un cache supprimé entre-temps', async () => {
    await mmkvPersister.persistClient(later(1));
    await mmkvPersister.persistClient(later(2));
    await mmkvPersister.removeClient();
    jest.advanceTimersByTime(AFTER_THE_DOOR);
    expect(await mmkvPersister.restoreClient()).toBeUndefined();
  });
});
