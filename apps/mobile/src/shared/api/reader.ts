import { ContentApiError } from '@huma/contracts';
import type { ContentApi } from '@huma/contracts';
import { createSession, SERVICE_APP, SessionError } from '@huma/remote-api';
import type { Credentials, Identity, Posting } from '@huma/remote-api';
import { STORAGE_KEYS, stateStorage } from '../lib/storage';
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
 * Opening the connection needs the official client's key, which no tracked file of this repository carries: it
 * reaches the bundle through `EXPO_PUBLIC_…`, written by whoever starts the build, and a build given none has no
 * identity to open a connection with — signing in refuses, and the app reads what the service gives to nobody. That
 * is the shape ADR-0032 asks for, and it is the shape a published build has.
 */

/** A reader as the app holds them: the token the client carries, the ways it changes, and a way to follow it. */
export type Reader = Readonly<{
  /**
   * Whether this build can open a connection at all — whether it was started with the key the service asks for.
   *
   * A screen reads it to know whether to offer signing in. A published build has no key, so it offers nothing, and
   * that is not a screen being careful: it is the only truthful thing it could show, there being no connection on
   * the other side of the button.
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

/** How the service takes a device's attestation: the one mode its own client mints, and the only one it reads. */
const CRYPT_MODE = 'jdly';

/**
 * The identity `env` was started with, or none when it was started without one.
 *
 * Both the key and the attested device have to be there: the service reads the pair, and one without the other is a
 * request it refuses. Anything missing leaves this `undefined`, which is what a published build has, and what a
 * screen reads to know there is no connection to offer.
 */
export const identityOf = (env: Readonly<Record<string, string | undefined>>): Identity | undefined => {
  const appSecret = env['EXPO_PUBLIC_APP_SECRET'] ?? '';
  const cryptValue = env['EXPO_PUBLIC_DEVICE_TOKEN'] ?? '';
  if (appSecret === '' || cryptValue === '') {
    return undefined;
  }
  return {
    appId: SERVICE_APP,
    appSecret,
    device: {
      description: env['EXPO_PUBLIC_DEVICE_NAME'] ?? 'humanite-lecteur',
      os: env['EXPO_PUBLIC_DEVICE_OS'] ?? 'Android',
      token: { crypt_mode: CRYPT_MODE, crypt_value: cryptValue },
    },
  };
};

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
  let held = disk.getItem(STORAGE_KEYS.readerToken) ?? undefined;
  const watchers = new Set<() => void>();
  const hold = (token: string | undefined): void => {
    if (token === held) {
      return;
    }
    held = token;
    if (token === undefined) {
      disk.removeItem(STORAGE_KEYS.readerToken);
    } else {
      disk.setItem(STORAGE_KEYS.readerToken, token);
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
 * The one variable set this module reads, declared as the app reads it rather than with all of Node's `process`:
 * Expo writes `process.env.EXPO_PUBLIC_…` into the bundle when it is built, and nothing else of `process` reaches
 * Hermes.
 */
declare const process: Readonly<{
  env: Readonly<{
    EXPO_PUBLIC_APP_SECRET?: string;
    EXPO_PUBLIC_DEVICE_TOKEN?: string;
    EXPO_PUBLIC_DEVICE_NAME?: string;
    EXPO_PUBLIC_DEVICE_OS?: string;
  }>;
}>;

/** The reader of this build: the identity it was started with, the platform's network, and the phone's own disk. */
export const READER: Reader = createReader(identityOf(process.env), POSTING, stateStorage(STORAGE_KEYS.readerToken));
