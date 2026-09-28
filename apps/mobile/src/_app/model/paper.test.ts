import { QueryClient } from '@tanstack/react-query';
import { ContentApiError } from '@huma/contracts';
import type { ContentApi } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { createReader, forgettingDeadTokens } from '#api';
import type { Reader } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import type { StateStorage } from '#lib/storage';
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
      header: () => null,
      text: async (): Promise<string> =>
        Promise.resolve(
          address.endsWith('/user/login')
            ? JSON.stringify({ x_user_token: 'jeton-de-labonne' })
            : JSON.stringify({ x_anonymous_token: 'anon-123' }),
        ),
    }),
};

/** A reader whose token this test can move, over a disk it holds in memory. */
const inMemory = (): StateStorage => {
  let kept: string | null = null;
  return {
    getItem: () => kept,
    setItem: (...[, value]) => {
      kept = value;
    },
    removeItem: () => {
      kept = null;
    },
  };
};

const aReader = (): Reader => createReader(IDENTITY, OPENED, inMemory(), inMemory());

/**
 * A reader that signs in once, then whose service refuses every later login — a session that cannot be reopened, as
 * after a password change. The first login earns a token; a reopen's login is refused, so the door forgets the token.
 */
const aReaderThatCannotReopen = (): Reader => {
  let logins = 0;
  const posting = {
    abortable: () => ({ signal: 0, abort: () => undefined }),
    after: () => () => undefined,
    post: async (address: string) => {
      const login = address.endsWith('/user/login');
      if (login) {
        logins += 1;
      }
      const refused = login && logins > 1;
      return Promise.resolve({
        status: refused ? 401 : 200,
        header: () => null,
        text: async (): Promise<string> =>
          Promise.resolve(
            login
              ? refused
                ? JSON.stringify({ error: { code: 10053, message: 'Customer login failed' } })
                : JSON.stringify({ x_user_token: 'jeton-de-labonne' })
              : JSON.stringify({ x_anonymous_token: 'anon-123' }),
          ),
      });
    },
  };
  return createReader(IDENTITY, posting, inMemory(), inMemory());
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
   * refuses under a dead token that cannot be reopened makes the door forget it, with nobody having pressed anything.
   * The paid bodies stayed in the cache — and on the disk — of a phone whose session had ended, for whoever next.
   */
  it('le vide quand un jeton mort, irrécupérable, a changé le lecteur sans qu’un écran l’ait fait', async () => {
    const reader = aReaderThatCannotReopen();
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

  /**
   * The other side, and the reason the >2h fix is safe for the cache: a dead token the app reopens is the same
   * subscriber, so the paper they were reading stays. Only a token the app cannot reopen drops it.
   */
  it('garde le journal quand un jeton mort est rouvert', async () => {
    const reader = aReader();
    const cache = aCache();
    forgetThePaperWhenTheReaderChanges(reader, cache);
    await reader.signIn(CREDENTIALS);
    cache.setQueryData(PAGE, { corps: 'payé' });
    storage.set(STORAGE_KEYS.queryCache, 'les pages payées');
    let calls = 0;
    const dyingThenReopened: ContentApi = {
      getSections: async () => Promise.resolve([]),
      getFeed: async () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new ContentApiError('expired', 'statut 403'))
          : Promise.resolve({ items: [], nextCursor: null });
      },
      getLiveFeed: async () => Promise.resolve({ items: [], nextCursor: null }),
      getArticle: async () => Promise.reject(new ContentApiError('not-found', 'rien')),
      search: async () => Promise.resolve({ items: [], nextCursor: null }),
    };
    await forgettingDeadTokens(dyingThenReopened, reader).getFeed({});
    expect(reader.token()).toBe('jeton-de-labonne');
    expect(cache.getQueryData(PAGE)).toEqual({ corps: 'payé' });
    expect(storage.getString(STORAGE_KEYS.queryCache)).toBe('les pages payées');
  });

  /**
   * A token the service slid is the same reader one reply later, so the paper they were reading is still theirs. It
   * is the reason a renewal tells no watcher: told as a change of reader, every request of a signed-in subscriber
   * would empty the cache the request before it filled, and the app would re-read the page it was showing.
   */
  it('garde le journal quand le service a seulement renouvelé le jeton', async () => {
    const reader = aReader();
    const cache = aCache();
    forgetThePaperWhenTheReaderChanges(reader, cache);
    await reader.signIn(CREDENTIALS);
    cache.setQueryData(PAGE, { corps: 'payé' });
    storage.set(STORAGE_KEYS.queryCache, 'les pages payées');
    reader.renew('jeton-de-labonne', 'jeton-suivant');
    expect(reader.token()).toBe('jeton-suivant');
    expect(cache.getQueryData(PAGE)).toEqual({ corps: 'payé' });
    expect(storage.getString(STORAGE_KEYS.queryCache)).toBe('les pages payées');
  });

  /** Several readings fail together on the same dead, irrecoverable token; the paper is dropped once, not once each. */
  it('ne vide qu’une fois quand plusieurs lectures échouent ensemble sur le même jeton', async () => {
    const reader = aReaderThatCannotReopen();
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
