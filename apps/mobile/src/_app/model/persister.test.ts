import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { mmkvPersister } from './persister';

const CLIENT: PersistedClient = {
  timestamp: 0,
  buster: 'test',
  clientState: { mutations: [], queries: [] },
};

describe('mmkvPersister', () => {
  beforeEach(() => {
    mmkvPersister.removeClient();
  });
  afterEach(() => {
    mmkvPersister.removeClient();
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
});
