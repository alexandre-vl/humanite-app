import { ContentApiError, QUESTION } from '@huma/contracts';
import type { ContentApi } from '@huma/contracts';
import { CLIENT_SECRET, SessionError } from '@huma/remote-api';
import type { Identity, Posting } from '@huma/remote-api';
import { describe, expect, it } from '@jest/globals';
import type { StateStorage } from '../lib/storage';
import { createReader, forgettingDeadTokens, identityFor, refusalOf } from './reader';
import type { Reader } from './reader';

/** An identity as a development build is given one: fake through and through, no value of the shape of a secret. */
const IDENTITY: Identity = {
  appId: 300,
  appSecret: 'secret-pour-le-test',
  device: { description: 'un téléphone', os: 'TestOS 1', token: { crypt_mode: 'jdly', crypt_value: 'deadbeef' } },
};

/** A disk that holds one string in memory, and says what it was asked to write. */
const disk = (initial?: string): StateStorage & { held: () => string | null } => {
  let held = initial ?? null;
  return {
    held: () => held,
    getItem: () => held,
    setItem: (...[, value]) => {
      held = value;
    },
    removeItem: () => {
      held = null;
    },
  };
};

/** A way of posting that answers a queue of replies in order: the anonymous token, then the user token. */
const posting = (replies: readonly Readonly<{ status: number; body: string }>[]): Posting<number> => {
  const queue = [...replies];
  return {
    abortable: () => ({ signal: 0, abort: () => undefined }),
    after: () => () => undefined,
    post: async () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('la sonde a posté sans réponse en réserve');
      }
      return Promise.resolve({
        status: next.status,
        header: () => null,
        text: async (): Promise<string> => Promise.resolve(next.body),
      });
    },
  };
};

const OPENED = [
  { status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-123' }) },
  { status: 200, body: JSON.stringify({ x_user_token: 'jeton-de-labonne' }) },
];

/** A connection reopened once: the sign-in earns one token, the reopen a different one, so the reopen is visible. */
const REOPENED = [
  ...OPENED,
  { status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-456' }) },
  { status: 200, body: JSON.stringify({ x_user_token: 'jeton-rouvert' }) },
];

describe('identityFor', () => {
  it('nomme l’application du service, la clé cliente, et l’appareil frappé depuis l’identifiant', () => {
    expect(identityFor('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toEqual({
      appId: 300,
      appSecret: CLIENT_SECRET,
      device: {
        description: 'humanite-lecteur',
        os: 'Android',
        token: {
          crypt_mode: 'jdly',
          crypt_value:
            '0eba45187f1623ea1602f03ecbc679ea7cab099ceec9621b158325ccb681ceef' +
            '894adf11479d91401b6f481dbf92d95ea3a8ea89726ae2848ec00e661cda20f8' +
            '76b249a10f8ec66c1bbb805d722ec639350f67d1cf87a0121f7dd621a9a16e49',
        },
      },
    });
  });

  it('frappe le même appareil pour le même identifiant, et un autre pour un autre', () => {
    expect(identityFor('un-appareil')).toEqual(identityFor('un-appareil'));
    expect(identityFor('un-appareil').device.token.crypt_value).not.toBe(
      identityFor('un-autre').device.token.crypt_value,
    );
  });
});

describe('createReader', () => {
  it('n’a aucun jeton tant que personne ne s’est connecté', () => {
    expect(createReader(IDENTITY, posting([]), disk(), disk()).token()).toBeUndefined();
  });

  it('rouvre sur le jeton que le téléphone gardait', () => {
    expect(createReader(IDENTITY, posting([]), disk('jeton-garde'), disk()).token()).toBe('jeton-garde');
  });

  it('tient le jeton et garde les identifiants, en mémoire et sur le disque', async () => {
    const kept = disk();
    const credentials = disk();
    const reader = createReader(IDENTITY, posting(OPENED), kept, credentials);
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    expect(reader.token()).toBe('jeton-de-labonne');
    expect(kept.held()).toBe('jeton-de-labonne');
    // Kept so the connection can be reopened when the token dies (ADR-0042); at the keystore, never in the clear store.
    expect(JSON.parse(credentials.held() ?? 'null')).toEqual({
      login: 'lecteur@example.org',
      password: 'un-mot-de-passe',
    });
  });

  it('oublie le jeton et les identifiants à la déconnexion', async () => {
    const kept = disk();
    const credentials = disk();
    const reader = createReader(IDENTITY, posting(OPENED), kept, credentials);
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    reader.signOut();
    expect(reader.token()).toBeUndefined();
    expect(kept.held()).toBeNull();
    expect(credentials.held()).toBeNull();
  });

  /** A refusal of the service reaches the screen as it was said, and a password the service rejected is never kept. */
  it('rend le refus du service tel qu’il l’a dit, et ne garde pas un mot de passe refusé', async () => {
    const credentials = disk();
    const reader = createReader(
      IDENTITY,
      posting([
        OPENED[0] ?? { status: 200, body: '{}' },
        { status: 401, body: JSON.stringify({ error: { code: 10053, message: 'Customer login failed' } }) },
      ]),
      disk(),
      credentials,
    );
    const failed: unknown = await reader
      .signIn({ login: 'lecteur@example.org', password: 'faux' })
      .catch((reason: unknown) => reason);
    expect(failed).toBeInstanceOf(SessionError);
    if (!(failed instanceof SessionError)) {
      throw new Error('attendu une SessionError');
    }
    expect(failed.code).toBe('refused');
    expect(reader.token()).toBeUndefined();
    expect(credentials.held()).toBeNull();
  });

  /** A published build carries no key, so there is no connection to offer and nothing to half-open. */
  it('refuse d’ouvrir une connexion quand la build n’a pas d’identité', async () => {
    const reader = createReader(undefined, posting([]), disk(), disk());
    await expect(reader.signIn({ login: 'lecteur@example.org', password: 'x' })).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  /** A published build has no key, so it has nothing to offer and a screen shows no way in. */
  it('n’offre la connexion que si la build a été démarrée avec une clé', () => {
    expect(createReader(IDENTITY, posting([]), disk(), disk()).offered()).toBe(true);
    expect(createReader(undefined, posting([]), disk(), disk()).offered()).toBe(false);
  });
});

describe('renew', () => {
  const signedIn = async (kept: ReturnType<typeof disk>): Promise<Reader> => {
    const reader = createReader(IDENTITY, posting(OPENED), kept, disk());
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    return reader;
  };

  /**
   * The service slides a reader's token: every reply to a request made under one carries its successor, good for two
   * hours from then. Left behind, the token the login earned is the one every request carries until it dies — two
   * hours after the login, whatever the reader was doing.
   */
  it('prend le jeton suivant à la place de celui qui est parti, en mémoire et sur le disque', async () => {
    const kept = disk();
    const reader = await signedIn(kept);
    reader.renew('jeton-de-labonne', 'jeton-suivant');
    expect(reader.token()).toBe('jeton-suivant');
    expect(kept.held()).toBe('jeton-suivant');
  });

  /**
   * The case that decides whether this may exist at all. What watches the token drops everything the app holds of the
   * paper, disk included, because a different reader was given it — and a slid token is the same reader, one reply
   * later. Told as a change, every request would empty the cache it had just filled.
   */
  it('ne prévient personne : le journal déjà lu reste en place', async () => {
    const reader = await signedIn(disk());
    let changes = 0;
    reader.watch(() => {
      changes += 1;
    });
    reader.renew('jeton-de-labonne', 'jeton-suivant');
    expect(changes).toBe(0);
  });

  /** A reply that lands after the reader signed out must not sign them back in. */
  it('ne ramène pas un lecteur qui s’est déconnecté pendant la requête', async () => {
    const kept = disk();
    const reader = await signedIn(kept);
    reader.signOut();
    reader.renew('jeton-de-labonne', 'jeton-suivant');
    expect(reader.token()).toBeUndefined();
    expect(kept.held()).toBeNull();
  });

  /** Two requests slide the same token at once; the slower reply must not put back what the faster one replaced. */
  it('ne remet pas un jeton qu’un plus récent a déjà remplacé', async () => {
    const reader = await signedIn(disk());
    reader.renew('jeton-de-labonne', 'jeton-rapide');
    reader.renew('jeton-de-labonne', 'jeton-lent');
    expect(reader.token()).toBe('jeton-rapide');
  });
});

describe('reopen', () => {
  const CREDENTIALS = { login: 'lecteur@example.org', password: 'un-mot-de-passe' };

  /**
   * Past two hours only a login mints a new token (ADR-0042), so the connection is reopened from the credentials the
   * keystore kept. It is the same subscriber, one token later, so it tells no watcher — what watches the token drops
   * the paper, and the paper is still theirs.
   */
  it('rouvre la connexion avec les identifiants gardés, sans prévenir personne', async () => {
    const reader = createReader(IDENTITY, posting(REOPENED), disk(), disk());
    await reader.signIn(CREDENTIALS);
    let changes = 0;
    reader.watch(() => {
      changes += 1;
    });
    expect(await reader.reopen()).toBe(true);
    expect(reader.token()).toBe('jeton-rouvert');
    expect(changes).toBe(0);
  });

  it('échoue, sans rien changer, quand aucun identifiant n’a été gardé', async () => {
    const reader = createReader(IDENTITY, posting([]), disk(), disk());
    expect(await reader.reopen()).toBe(false);
    expect(reader.token()).toBeUndefined();
  });

  /** A password changed since sign-in: the reopen fails, the old token is left for the door to forget. */
  it('échoue quand le service refuse les identifiants gardés', async () => {
    const refusing = [
      ...OPENED,
      { status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-456' }) },
      { status: 401, body: JSON.stringify({ error: { code: 10053, message: 'Customer login failed' } }) },
    ];
    const reader = createReader(IDENTITY, posting(refusing), disk(), disk());
    await reader.signIn(CREDENTIALS);
    expect(await reader.reopen()).toBe(false);
    expect(reader.token()).toBe('jeton-de-labonne');
  });

  /** Every route fails 403 at once; the connection is reopened once between them, not once each. */
  it('ne rouvre qu’une fois quand plusieurs lectures échouent ensemble', async () => {
    const reader = createReader(IDENTITY, posting(REOPENED), disk(), disk());
    await reader.signIn(CREDENTIALS);
    const results = await Promise.all([reader.reopen(), reader.reopen(), reader.reopen()]);
    expect(results).toEqual([true, true, true]);
    expect(reader.token()).toBe('jeton-rouvert');
  });
});

describe('refusalOf', () => {
  /** A wrong password is something to correct; everything else is something to wait out. */
  it('distingue le refus du service de son silence, et range le reste avec le silence', () => {
    expect(refusalOf(new SessionError('refused', 'Customer login failed'))).toBe('refused');
    expect(refusalOf(new SessionError('unavailable', 'le service a répondu 503'))).toBe('unavailable');
    expect(refusalOf(new SessionError('malformed', 'forme inattendue'))).toBe('unavailable');
    expect(refusalOf(new Error('la requête n’est jamais partie'))).toBe('unavailable');
    expect(refusalOf('rien du tout')).toBe('unavailable');
  });
});

describe('watch', () => {
  /** A token can go without anyone pressing anything, so whoever shows the connection follows it rather than copies it. */
  it('prévient à chaque changement du jeton, et se tait une fois qu’on ne l’écoute plus', async () => {
    const reader = createReader(IDENTITY, posting([...OPENED, ...OPENED]), disk(), disk());
    let changes = 0;
    const stop = reader.watch(() => {
      changes += 1;
    });
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    reader.signOut();
    expect(changes).toBe(2);
    stop();
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    expect(changes).toBe(2);
  });

  /** Signing out twice is one change, not two: what did not move is not news. */
  it('ne prévient de rien quand le jeton ne bouge pas', () => {
    const reader = createReader(IDENTITY, posting([]), disk(), disk());
    let changes = 0;
    reader.watch(() => {
      changes += 1;
    });
    reader.signOut();
    reader.signOut();
    expect(changes).toBe(0);
  });
});

describe('forgettingDeadTokens', () => {
  /** A content read whose answer never fails, so only the failing one below is doing anything. */
  const reading = (fails: ContentApiError | null): ContentApi => ({
    getSections: async () => (fails === null ? [] : Promise.reject(fails)),
    getFeed: async () => (fails === null ? { items: [], nextCursor: null } : Promise.reject(fails)),
    getLiveFeed: async () => (fails === null ? { items: [], nextCursor: null } : Promise.reject(fails)),
    getArticle: async () => Promise.reject(fails ?? new ContentApiError('not-found', 'rien')),
    search: async () => (fails === null ? { items: [], nextCursor: null } : Promise.reject(fails)),
  });

  /** Signed in, with a posting whose queue is exhausted, so a reopen has no reply and must fail. */
  const signedIn = async (): Promise<ReturnType<typeof createReader>> => {
    const reader = createReader(IDENTITY, posting(OPENED), disk(), disk());
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    return reader;
  };

  /**
   * The service answers 403 to a dead token on every route it serves, the front page included, so a token left in
   * place costs a subscriber the paper and not only the articles they pay for. With no reopen possible — here the
   * posting is spent — the token is forgotten and the reader signed out.
   */
  it('oublie le jeton quand la reconnexion échoue, faute de pouvoir la rouvrir', async () => {
    const reader = await signedIn();
    const door = forgettingDeadTokens(reading(new ContentApiError('expired', 'statut 403')), reader);
    await expect(door.getFeed({})).rejects.toMatchObject({ code: 'expired' });
    expect(reader.token()).toBeUndefined();
  });

  /**
   * The case this whole feature exists for: a subscriber comes back after two hours, the token is dead, and the app
   * reopens from the kept credentials and serves the reading — they never see the dead token. The reader stays signed
   * in, under the token the reopen earned.
   */
  it('rouvre la connexion et sert la lecture quand le jeton a expiré', async () => {
    const reader = createReader(IDENTITY, posting(REOPENED), disk(), disk());
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    let calls = 0;
    const readingThenServing: ContentApi = {
      ...reading(null),
      getFeed: async () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new ContentApiError('expired', 'statut 403'))
          : Promise.resolve({ items: [], nextCursor: null });
      },
    };
    const door = forgettingDeadTokens(readingThenServing, reader);
    expect(await door.getFeed({})).toEqual({ items: [], nextCursor: null });
    expect(calls).toBe(2);
    expect(reader.token()).toBe('jeton-rouvert');
  });

  it('oublie le jeton quelle que soit la lecture qui a échoué', async () => {
    const reads: readonly ((door: ContentApi) => Promise<unknown>)[] = [
      async (door) => door.getSections(),
      async (door) => door.getLiveFeed({}),
      async (door) => door.search({ text: QUESTION.parse('climat') }),
      async (door) => door.getFeed({}),
    ];
    for (const read of reads) {
      const reader = await signedIn();
      const door = forgettingDeadTokens(reading(new ContentApiError('expired', 'statut 403')), reader);
      await expect(read(door)).rejects.toMatchObject({ code: 'expired' });
      expect(reader.token()).toBeUndefined();
    }
  });

  /** A withheld article is not a dead connection: the reader stays signed in, and the wall is the right answer. */
  it('garde le jeton quand le service refuse pour toute autre raison', async () => {
    const reader = await signedIn();
    const door = forgettingDeadTokens(reading(new ContentApiError('refused', 'réservé')), reader);
    await expect(door.getFeed({})).rejects.toMatchObject({ code: 'refused' });
    expect(reader.token()).toBe('jeton-de-labonne');
  });

  it('laisse passer ce qui a réussi, sans rien oublier', async () => {
    const reader = await signedIn();
    const door = forgettingDeadTokens(reading(null), reader);
    expect(await door.getSections()).toEqual([]);
    expect(reader.token()).toBe('jeton-de-labonne');
  });
});
