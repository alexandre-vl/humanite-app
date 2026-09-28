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
import { isRecord } from '@huma/unknown';
import { randomUUID } from 'expo-crypto';
import { CONTENT_SOURCE } from '../config';
import { keychain, keychainCredentials, KEYCHAIN_KEYS, storage, STORAGE_KEYS } from '../lib/storage';
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
  /**
   * Takes `fresh` in place of `sent`, the token a request carried, and tells nobody.
   *
   * The service slides a reader's token: every reply to a request made under one carries its successor, good for two
   * hours from then, so a reader who keeps reading keeps a living token and is never signed out mid-session. It is
   * the same reader throughout — same subscriber, same device, only a later token — which is why this is not `hold`
   * and notifies no watcher: what watches the token drops everything the app holds of the paper (ADR-0041, R3).
   *
   * `sent` is what makes it safe to take: it is applied only while the token held is still the one that went out, so
   * a reply that lands after a sign-out does not sign the reader back in, and a slower reply cannot put back a token
   * a newer one has already replaced.
   */
  renew: (sent: string, fresh: string) => void;
  /**
   * Reopens the connection from the credentials kept at sign-in, and answers whether it opened.
   *
   * A token lives two hours, and past that only a login mints a new one — no refresh route serves this application
   * (ADR-0042). So when the service stops honouring the token, the app opens the connection again with the login it
   * kept, rather than sign the subscriber out in the middle of reading. It answers `false`, and keeps nothing, when
   * there are no credentials to try or the service refuses them — a password changed since — and the caller then
   * signs out. It is the same subscriber throughout, so the token it earns is held without telling any watcher.
   */
  reopen: () => Promise<boolean>;
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
  credentialsDisk: StateStorage,
): Reader => {
  let held = disk.getItem(KEYCHAIN_KEYS.readerToken) ?? undefined;
  const watchers = new Set<() => void>();

  /** The credentials kept at sign-in, read back to reopen a dead connection, or none when none were kept. */
  const keptCredentials = (): Credentials | null => {
    const stored = credentialsDisk.getItem(KEYCHAIN_KEYS.readerCredentials);
    if (stored === null) {
      return null;
    }
    try {
      const read: unknown = JSON.parse(stored);
      const login = isRecord(read) ? read['login'] : undefined;
      const password = isRecord(read) ? read['password'] : undefined;
      return typeof login === 'string' && typeof password === 'string' ? { login, password } : null;
    } catch {
      return null;
    }
  };

  /**
   * Writes the token down, in memory and on the disk, and says whether it moved.
   *
   * The disk is written whenever it does, renewals included: what is in memory is gone when the process is, and a
   * phone that restarts on the token a login earned rather than on the one the reading before it earned is a phone
   * that can restart on a token two hours older than the app's last request. The write is synchronous and happens
   * once per reply that slides the token — if that ever measures as a cost on a phone, holding the newest token for
   * a few minutes before writing it is the answer, and the token stays valid for two hours either way.
   */
  const write = (token: string | undefined): boolean => {
    if (token === held) {
      return false;
    }
    held = token;
    if (token === undefined) {
      disk.removeItem(KEYCHAIN_KEYS.readerToken);
    } else {
      disk.setItem(KEYCHAIN_KEYS.readerToken, token);
    }
    return true;
  };

  /** Writes the token down and tells whoever is watching: this is a different reader from the one before. */
  const hold = (token: string | undefined): void => {
    if (write(token)) {
      for (const watcher of [...watchers]) {
        watcher();
      }
    }
  };

  /**
   * The reopen under way, so several reads that failed on the same dead token reopen the connection once between them.
   *
   * Every route the app reads answers a dead token with `403`, so a screen showing three lists fails three times at
   * once; without this each would open its own connection, three logins for one dead token. The promise is cleared
   * when it settles, so the next expiry — two hours on — opens a fresh one.
   */
  let reopening: Promise<boolean> | undefined;

  return {
    offered: () => identity !== undefined,
    token: () => held,
    /**
     * Signs the reader in with what they typed, holds what their login earned, and keeps the credentials in the
     * keystore so a connection can be reopened when the token dies. A build with no identity cannot open the
     * connection at all, and says so as the service's own refusals are said, so a screen has one thing to read rather
     * than two. The credentials are kept only once the service has accepted them, so a wrong password is never
     * written; they go to the keystore and nowhere else, and are erased the moment the reader signs out (ADR-0042).
     */
    signIn: async (credentials: Credentials): Promise<void> => {
      if (identity === undefined) {
        throw new SessionError('unavailable', 'cette build n’a pas de quoi ouvrir une connexion au service');
      }
      const token = await createSession(identity, ports).open(credentials);
      credentialsDisk.setItem(KEYCHAIN_KEYS.readerCredentials, JSON.stringify(credentials));
      hold(token);
    },
    signOut: () => {
      credentialsDisk.removeItem(KEYCHAIN_KEYS.readerCredentials);
      hold(undefined);
    },
    reopen: async (): Promise<boolean> => {
      reopening ??= (async (): Promise<boolean> => {
        const credentials = identity === undefined ? null : keptCredentials();
        if (identity === undefined || credentials === null) {
          return false;
        }
        try {
          // The same subscriber, one token later: held without notifying a watcher, so the paper they were reading
          // stays in the cache (ADR-0042). A wrong answer here — a service that will not answer — is a `false`, not a
          // throw: the caller signs out and the reader is shown a way back in, rather than a screen that never ends.
          write(await createSession(identity, ports).open(credentials));
          return true;
        } catch {
          return false;
        }
      })().finally(() => {
        reopening = undefined;
      });
      return reopening;
    },
    renew: (sent: string, fresh: string) => {
      if (held === sent) {
        write(fresh);
      }
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
 * The same content, with one thing more: a reading the service refuses under this reader's dead token reopens the
 * connection and asks again, or, failing that, forgets the token (ADR-0042, and ADR-0033 R9 before it).
 *
 * The service answers `403` to a dead token on every route it serves, not only the ones holding a body a subscription
 * pays for — the front page included. A token lives two hours, and past that only a login mints a new one, so a
 * subscriber who leaves the app overnight comes back to a dead token on every list. The connection is reopened from
 * the credentials the keystore kept: it is the same subscriber, so the reading is asked again under the new token and
 * they never see it happen. Reopened once between the readings that failed together, not once each.
 *
 * When there is nothing to reopen with, or the service refuses the credentials — a password changed since — the token
 * is forgotten instead. `expired` is a cause another try can answer differently, because by then the token it failed
 * under is gone and the request goes out as anybody's: the reader sees a page load, not a wall, and the screens that
 * ask whether anyone is signed in say no, which by then is true.
 */
export const forgettingDeadTokens = (api: ContentApi, reader: Reader): ContentApi => {
  const throughExpiry = async <Value>(read: () => Promise<Value>): Promise<Value> => {
    try {
      return await read();
    } catch (reason: unknown) {
      if (reason instanceof ContentApiError && reason.code === 'expired') {
        if (await reader.reopen()) {
          // Reopened under the same subscriber: ask again, once. A second expiry is left to propagate rather than
          // reopen anew — a fresh token cannot already be dead, so a second one is a loop, not a retry.
          return read();
        }
        reader.signOut();
      }
      throw reason;
    }
  };
  return {
    getSections: async () => throughExpiry(async () => api.getSections()),
    getFeed: async (query) => throughExpiry(async () => api.getFeed(query)),
    getLiveFeed: async (query) => throughExpiry(async () => api.getLiveFeed(query)),
    getArticle: async (id) => throughExpiry(async () => api.getArticle(id)),
    search: async (query) => throughExpiry(async () => api.search(query)),
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
    return {
      status: reply.status,
      header: (name) => reply.headers.get(name),
      text: async (): Promise<string> => reply.text(),
    };
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
 * The token and the credentials both go to the keystore and not to the store the rest of the app writes to. The rest
 * is a preference or a page of the paper, and a phone that loses either loses nothing anyone wanted; these two are
 * what prove a subscription belongs to whoever is holding the phone, and reopen it when its token dies.
 */
export const READER: Reader = createReader(identityOfBuild(), POSTING, keychain, keychainCredentials);
