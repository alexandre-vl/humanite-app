import { ContentApiError } from '@huma/contracts';
import type { ContentApi } from '@huma/contracts';
import {
  CLIENT_SECRET,
  createSession,
  DEVICE_CRYPT_MODE,
  mintDeviceToken,
  SERVICE_APP,
  SessionError,
} from '@huma/remote-api';
import type { Credentials, Identity, Posting } from '@huma/remote-api';
import { randomUUID } from 'expo-crypto';
import { CONTENT_SOURCE } from '../config';
import { keychain, KEYCHAIN_KEYS, storage, STORAGE_KEYS } from '../lib/storage';
import type { StateStorage } from '../lib/storage';

/**
 * The reader's own connection to the journal's service: the token their login earned, and where it is kept.
 *
 * It is one string and three ways to change it, and no React state at all: what re-paints a screen when a reader signs
 * in is a store of the feature that owns that screen, which is where this app keeps state. Here is the other side —
 * what the client of the service asks at every request, which must answer without a hook, from anywhere, and answer
 * the same to everyone. A store that wants to follow it watches it, rather than taking a copy at its first line: the
 * token can go without anyone having pressed anything, when the service stops honouring it.
 *
 * Opening the connection needs the official client's credential and a device attested to the service. The credential
 * is a client one, the same in every install, carried in the app (`CLIENT_SECRET`); the device is one this install
 * mints for itself, from a random identifier it keeps (`mintDeviceToken`). So every build that reads the service can
 * offer to sign in — no build-time key, nothing borrowed — and what a reader adds is only their own login, typed and
 * never kept. A build that reads the simulated corpus opens no connection and offers none (ADR-0040).
 */

/** A reader as the app holds them: the token the client carries, the ways it changes, and a way to follow it. */
export type Reader = Readonly<{
  /**
   * Whether this build opens a connection to the journal's service at all.
   *
   * A screen reads it to know whether to offer signing in. Every build that reads the service does — it carries the
   * client credential and mints its own device — so the offer stands; a build reading the simulated corpus opens no
   * connection, and offering one would be a button with nothing behind it.
   */
  offered: () => boolean;
  token: () => string | undefined;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => void;
  /** Calls `whenChanged` whenever the token does, and answers with what stops watching. */
  watch: (whenChanged: () => void) => () => void;
}>;

/** Why a connection did not open, as the two things a screen has to say about it. */
export type Refusal = 'refused' | 'unavailable';

/**
 * What a screen says of a connection that did not open.
 *
 * The service tells a wrong password apart from a service that would not answer, and a reader is owed that difference:
 * one is something to correct, the other something to wait out. Everything else — a reply no reading understands, a
 * network that never left the phone — reads as the service not answering, which is what it amounts to from here.
 */
export const refusalOf = (reason: unknown): Refusal =>
  reason instanceof SessionError && reason.code === 'refused' ? 'refused' : 'unavailable';

/** How this app names itself as a device to the service: a reader's app, on Android, as the attestation carries it. */
const DEVICE_DESCRIPTION = 'humanite-lecteur';
const DEVICE_OS = 'Android';

/**
 * The identity that opens a connection for a device known by `deviceId`.
 *
 * The credential is the client one every install carries (`CLIENT_SECRET`); the device is this install's own,
 * `deviceId` minted into the attestation the service reads. The same identifier always builds the same identity, so
 * the service is met by one steady device.
 */
export const identityFor = (deviceId: string): Identity => ({
  appId: SERVICE_APP,
  appSecret: CLIENT_SECRET,
  device: {
    description: DEVICE_DESCRIPTION,
    os: DEVICE_OS,
    token: { crypt_mode: DEVICE_CRYPT_MODE, crypt_value: mintDeviceToken(deviceId) },
  },
});

/**
 * The identifier this install attests as its device: the one it kept, or a fresh one it keeps now.
 *
 * It is generated once, the first time a connection is opened, and read from the disk every time after, so the
 * service sees the same device across launches. A random UUID and no secret — the whole attestation is rebuilt from
 * it — so it lives on the ordinary disk, not the keystore.
 */
const deviceIdKept = (): string => {
  const kept = storage.getString(STORAGE_KEYS.deviceId);
  if (kept !== undefined) {
    return kept;
  }
  const fresh = randomUUID().toUpperCase();
  storage.set(STORAGE_KEYS.deviceId, fresh);
  return fresh;
};

/**
 * The identity a build opens the connection with, or none for a build that reads the simulated corpus.
 *
 * A build that reads the service carries the client credential and mints its own device, so it always has one; a
 * build on the corpus opens nothing, and holds no identity to offer.
 */
const identityOfBuild = (): Identity | undefined =>
  CONTENT_SOURCE === 'service' ? identityFor(deviceIdKept()) : undefined;

/**
 * A reader over one identity, one way of posting to the service, and one place on the disk.
 *
 * The disk is read once, at the first line, and held in memory after: the client asks for the token at every request,
 * which is a synchronous question, and a read of the disk each time would be one store call per request. The two are
 * written together whenever the token changes, so a phone that restarts opens where it left off, and whoever is
 * watching is told in the same breath.
 */
export const createReader = <Signal>(
  identity: Identity | undefined,
  ports: Posting<Signal>,
  disk: StateStorage,
): Reader => {
  let held = disk.getItem(KEYCHAIN_KEYS.readerToken) ?? undefined;
  const watchers = new Set<() => void>();
  const hold = (token: string | undefined): void => {
    if (token === held) {
      return;
    }
    held = token;
    if (token === undefined) {
      disk.removeItem(KEYCHAIN_KEYS.readerToken);
    } else {
      disk.setItem(KEYCHAIN_KEYS.readerToken, token);
    }
    for (const watcher of [...watchers]) {
      watcher();
    }
  };
  return {
    offered: () => identity !== undefined,
    token: () => held,
    /**
     * Signs the reader in with what they typed, and holds what their login earned. A build with no identity cannot
     * open the connection at all, and says so as the service's own refusals are said, so a screen has one thing to
     * read rather than two. Nothing else is kept of what was typed: the password goes to the service and is forgotten
     * here, the token being what the reader is known by afterwards.
     */
    signIn: async (credentials: Credentials): Promise<void> => {
      if (identity === undefined) {
        throw new SessionError('unavailable', 'cette build n’a pas de quoi ouvrir une connexion au service');
      }
      hold(await createSession(identity, ports).open(credentials));
    },
    signOut: () => {
      hold(undefined);
    },
    watch: (whenChanged: () => void) => {
      watchers.add(whenChanged);
      return () => {
        watchers.delete(whenChanged);
      };
    },
  };
};

/**
 * The same content, with one thing more: a reading the service refused under this reader's own token forgets that
 * token (ADR-0033, R9).
 *
 * The service answers `403` to a dead token on every route it serves, not only the ones holding a body a subscription
 * pays for — the front page included. So a token the service has stopped honouring does not cost a subscriber their
 * premium articles: it costs them the paper. Left in place it would go out with the next request and be refused
 * again, for as long as the app ran, and the only way out would be for the reader to guess that signing out mends it.
 *
 * Forgetting it turns that into nothing at all. `expired` is a cause another try can answer differently — which is
 * the whole of what makes a cause retryable — because by the time the next try leaves, the token it failed under is
 * gone, and the same request goes out as anybody's. The reader sees a page load, not a wall, and the screens that ask
 * whether anyone is signed in say no, which by then is true.
 */
export const forgettingDeadTokens = (api: ContentApi, reader: Reader): ContentApi => {
  const watching = async <Value>(read: Promise<Value>): Promise<Value> => {
    try {
      return await read;
    } catch (reason: unknown) {
      if (reason instanceof ContentApiError && reason.code === 'expired') {
        reader.signOut();
      }
      throw reason;
    }
  };
  return {
    getSections: async () => watching(api.getSections()),
    getFeed: async (query) => watching(api.getFeed(query)),
    getLiveFeed: async (query) => watching(api.getLiveFeed(query)),
    getArticle: async (id) => watching(api.getArticle(id)),
    search: async (query) => watching(api.search(query)),
  };
};

/**
 * One `POST` to the service over the platform's own network, with the abort and the timer the deadline needs.
 *
 * It is the same three ports the read client is handed, and for the same reason: the platform bounds nothing, so a
 * login to a host that takes the request and never answers would never come back — and the screen waiting on it holds
 * the only button that could sign the reader in.
 */
const POSTING: Posting<AbortSignal> = {
  post: async (address, headers, body, signal) => {
    const reply = await fetch(address, { method: 'POST', headers, body, signal, credentials: 'omit' });
    return { status: reply.status, text: async (): Promise<string> => reply.text() };
  },
  abortable: () => new AbortController(),
  after: (delay, then) => {
    const timer = setTimeout(then, delay);
    return () => {
      clearTimeout(timer);
    };
  },
};

/**
 * The reader of this build: the identity it opens the connection with, the platform's network, and the phone's own
 * keystore.
 *
 * The token goes to the keystore and not to the store the rest of the app writes to. The rest is a preference or a
 * page of the paper, and a phone that loses either loses nothing anyone wanted; this is what proves a subscription
 * belongs to whoever is holding the phone.
 */
export const READER: Reader = createReader(identityOfBuild(), POSTING, keychain);
