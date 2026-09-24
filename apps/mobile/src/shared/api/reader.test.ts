import { SessionError } from '@huma/remote-api';
import type { Identity, Posting } from '@huma/remote-api';
import { describe, expect, it } from '@jest/globals';
import type { StateStorage } from '../lib/storage';
import { createReader, identityOf, refusalOf } from './reader';

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
const posting = (replies: readonly Readonly<{ status: number; body: string }>[]): Posting => {
  const queue = [...replies];
  return {
    post: async () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('la sonde a posté sans réponse en réserve');
      }
      return Promise.resolve({ status: next.status, text: async (): Promise<string> => Promise.resolve(next.body) });
    },
  };
};

const OPENED = [
  { status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-123' }) },
  { status: 200, body: JSON.stringify({ x_user_token: 'jeton-de-labonne' }) },
];

describe('identityOf', () => {
  it('n’ouvre aucune connexion sans la clé ni sans l’appareil attesté', () => {
    expect(identityOf({})).toBeUndefined();
    expect(identityOf({ EXPO_PUBLIC_APP_SECRET: 'une-cle' })).toBeUndefined();
    expect(identityOf({ EXPO_PUBLIC_DEVICE_TOKEN: 'cafe' })).toBeUndefined();
    expect(identityOf({ EXPO_PUBLIC_APP_SECRET: '', EXPO_PUBLIC_DEVICE_TOKEN: 'cafe' })).toBeUndefined();
  });

  it('nomme l’application du service et l’attestation que son client officiel frappe', () => {
    expect(identityOf({ EXPO_PUBLIC_APP_SECRET: 'une-cle', EXPO_PUBLIC_DEVICE_TOKEN: 'cafe' })).toEqual({
      appId: 300,
      appSecret: 'une-cle',
      device: { description: 'humanite-lecteur', os: 'Android', token: { crypt_mode: 'jdly', crypt_value: 'cafe' } },
    });
  });
});

describe('createReader', () => {
  it('n’a aucun jeton tant que personne ne s’est connecté', () => {
    expect(createReader(IDENTITY, posting([]), disk()).token()).toBeUndefined();
  });

  it('rouvre sur le jeton que le téléphone gardait', () => {
    expect(createReader(IDENTITY, posting([]), disk('jeton-garde')).token()).toBe('jeton-garde');
  });

  it('tient le jeton que la connexion a gagné, en mémoire et sur le disque', async () => {
    const kept = disk();
    const reader = createReader(IDENTITY, posting(OPENED), kept);
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    expect(reader.token()).toBe('jeton-de-labonne');
    expect(kept.held()).toBe('jeton-de-labonne');
  });

  it('oublie le lecteur des deux côtés à la déconnexion', async () => {
    const kept = disk();
    const reader = createReader(IDENTITY, posting(OPENED), kept);
    await reader.signIn({ login: 'lecteur@example.org', password: 'un-mot-de-passe' });
    reader.signOut();
    expect(reader.token()).toBeUndefined();
    expect(kept.held()).toBeNull();
  });

  /** A refusal of the service reaches the screen as it was said, rather than as a token that never arrived. */
  it('rend le refus du service tel qu’il l’a dit', async () => {
    const reader = createReader(
      IDENTITY,
      posting([
        OPENED[0] ?? { status: 200, body: '{}' },
        { status: 401, body: JSON.stringify({ error: { code: 10053, message: 'Customer login failed' } }) },
      ]),
      disk(),
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
  });

  /** A published build carries no key, so there is no connection to offer and nothing to half-open. */
  it('refuse d’ouvrir une connexion quand la build n’a pas d’identité', async () => {
    const reader = createReader(undefined, posting([]), disk());
    await expect(reader.signIn({ login: 'lecteur@example.org', password: 'x' })).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  /** A published build has no key, so it has nothing to offer and a screen shows no way in. */
  it('n’offre la connexion que si la build a été démarrée avec une clé', () => {
    expect(createReader(IDENTITY, posting([]), disk()).offered()).toBe(true);
    expect(createReader(undefined, posting([]), disk()).offered()).toBe(false);
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
