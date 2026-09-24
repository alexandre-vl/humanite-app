import { QueryClient } from '@tanstack/react-query';
import { ContentApiError } from '@huma/contracts';
import type { ContentApi } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { createReader, forgettingDeadTokens } from '#api';
import type { Reader } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { forgetThePaperWhenTheReaderChanges } from './paper';

const IDENTITY = {
  appId: 300,
  appSecret: 'secret-pour-le-test',
  device: { description: 'un téléphone', os: 'TestOS 1', token: { crypt_mode: 'jdly', crypt_value: 'deadbeef' } },
};

const CREDENTIALS = { login: 'lecteur@example.org', password: 'un-mot-de-passe' };

/** The two exchanges of a connection, answered as the service answers them when they work. */
const OPENED = {
  abortable: () => ({ signal: 0, abort: () => undefined }),
  after: () => () => undefined,
  post: async (address: string) =>
    Promise.resolve({
      status: 200,
      text: async (): Promise<string> =>
        Promise.resolve(
          address.endsWith('/user/login')
            ? JSON.stringify({ x_user_token: 'jeton-de-labonne' })
            : JSON.stringify({ x_anonymous_token: 'anon-123' }),
        ),
    }),
};

/** A reader whose token this test can move, over a disk it holds in memory. */
const aReader = (): Reader => {
  let kept: string | null = null;
  return createReader(IDENTITY, OPENED, {
    getItem: () => kept,
    setItem: (...[, value]) => {
      kept = value;
    },
    removeItem: () => {
      kept = null;
    },
  });
};

/** A page of the paper, as a reading under one reader leaves it in the cache. */
const PAGE = ['articles', 'one', '3868546'] as const;

const aCache = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

beforeEach(() => {
  storage.forget(STORAGE_KEYS.queryCache);
});

describe('forgetThePaperWhenTheReaderChanges', () => {
  it('vide le cache, en mémoire et sur le disque, dès qu’un lecteur se connecte', async () => {
    const reader = aReader();
    const cache = aCache();
    forgetThePaperWhenTheReaderChanges(reader, cache);
    cache.setQueryData(PAGE, { corps: 'lu par personne' });
    storage.set(STORAGE_KEYS.queryCache, 'les pages lues par personne');
    await reader.signIn(CREDENTIALS);
    expect(cache.getQueryData(PAGE)).toBeUndefined();
    expect(storage.getString(STORAGE_KEYS.queryCache)).toBeUndefined();
  });

  it('le vide aussi quand le lecteur se déconnecte, ce qu’il vient de lire ne lui appartenant plus', async () => {
    const reader = aReader();
    const cache = aCache();
    forgetThePaperWhenTheReaderChanges(reader, cache);
    await reader.signIn(CREDENTIALS);
    cache.setQueryData(PAGE, { corps: 'payé' });
    storage.set(STORAGE_KEYS.queryCache, 'les pages payées');
    reader.signOut();
    expect(cache.getQueryData(PAGE)).toBeUndefined();
    expect(storage.getString(STORAGE_KEYS.queryCache)).toBeUndefined();
  });

  /**
   * The case that put this here. A screen is not the only thing that changes the reader: a reading the service
   * refuses under a dead token makes the door forget that token, with nobody having pressed anything. The paid bodies
   * stayed in the cache — and on the disk — of a phone whose session had ended, for whoever picked it up next.
   */
  it('le vide quand c’est un jeton mort, et non un écran, qui a changé le lecteur', async () => {
    const reader = aReader();
    const cache = aCache();
    forgetThePaperWhenTheReaderChanges(reader, cache);
    await reader.signIn(CREDENTIALS);
    cache.setQueryData(PAGE, { corps: 'payé' });
    storage.set(STORAGE_KEYS.queryCache, 'les pages payées');
    const refusing: ContentApi = {
      getSections: async () => Promise.reject(new ContentApiError('expired', 'statut 403')),
      getFeed: async () => Promise.reject(new ContentApiError('expired', 'statut 403')),
      getLiveFeed: async () => Promise.reject(new ContentApiError('expired', 'statut 403')),
      getArticle: async () => Promise.reject(new ContentApiError('expired', 'statut 403')),
      search: async () => Promise.reject(new ContentApiError('expired', 'statut 403')),
    };
    await expect(forgettingDeadTokens(refusing, reader).getFeed({})).rejects.toMatchObject({ code: 'expired' });
    expect(reader.token()).toBeUndefined();
    expect(cache.getQueryData(PAGE)).toBeUndefined();
    expect(storage.getString(STORAGE_KEYS.queryCache)).toBeUndefined();
  });

  /** Several readings fail together on the same dead token; the paper is dropped once, not once per reading. */
  it('ne vide qu’une fois quand plusieurs lectures échouent ensemble sur le même jeton', async () => {
    const reader = aReader();
    await reader.signIn(CREDENTIALS);
    let emptied = 0;
    reader.watch(() => {
      emptied += 1;
    });
    const refusing: ContentApi = {
      getSections: async () => Promise.reject(new ContentApiError('expired', '403')),
      getFeed: async () => Promise.reject(new ContentApiError('expired', '403')),
      getLiveFeed: async () => Promise.reject(new ContentApiError('expired', '403')),
      getArticle: async () => Promise.reject(new ContentApiError('expired', '403')),
      search: async () => Promise.reject(new ContentApiError('expired', '403')),
    };
    const door = forgettingDeadTokens(refusing, reader);
    await Promise.allSettled([door.getFeed({}), door.getSections(), door.getLiveFeed({})]);
    expect(emptied).toBe(1);
  });

  /**
   * A reading that left under the old reader must not land under the new one. It was asked for as nobody, and what it
   * answers carries that — a body kept back, a card flagged withheld — so letting it arrive would put the wall back
   * in front of a subscriber who has just signed in.
   */
  it('ne laisse pas atterrir une lecture partie sous l’ancien lecteur', async () => {
    const reader = aReader();
    const cache = aCache();
    forgetThePaperWhenTheReaderChanges(reader, cache);
    let answer = (): void => undefined;
    const late = new Promise<Readonly<{ corps: string }>>((resolve) => {
      answer = () => {
        resolve({ corps: 'retenu, lu par personne' });
      };
    });
    const reading = cache.query({ queryKey: PAGE, queryFn: async () => late }).catch(() => undefined);
    await reader.signIn(CREDENTIALS);
    answer();
    await reading;
    expect(cache.getQueryData(PAGE)).toBeUndefined();
  });
});
