import {
  ANONYMOUS_TOKEN_REPLY,
  ANONYMOUS_TOKEN_REQUEST,
  LOGIN_REQUEST,
  SERVICE_ERROR,
  USER_TOKEN_REPLY,
} from '@huma/contracts';
import type { DeviceAuth, LoginRequest } from '@huma/contracts';
import { SERVICE, SERVICE_ROOT } from './routes.ts';

/**
 * Opening a subscriber's connection to the journal's service, so the app reads what their subscription pays for.
 *
 * This is not the read client `createRemoteApi` builds, and on purpose: that client carries no borrowed secret and
 * never will (ADR-0032, R2). Opening a connection does carry one — the official app's `app_secret` and a device it
 * attested — because the service only hands an anonymous token, and then a user token, to a caller it takes for that
 * app. The secret is not written here: it reaches `createSession` at runtime, from where a build keeps its secrets and
 * a tracked file never does. What the two exchanges give back is one string, the user token, which the read client
 * then carries as its own — a token a reader's own login earned, not a secret of the official client's.
 */

/** Why opening a connection failed, as the one word a screen branches on — the causes `ContentApiError` names, less. */
export type SessionErrorCode = 'refused' | 'unavailable' | 'malformed';

/** An error raised while opening a connection, tagged with a code the caller can branch on. */
export class SessionError extends Error {
  readonly code: SessionErrorCode;
  constructor(code: SessionErrorCode, message: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

/** One request out and its reply's status and body — a `POST` the read client's GET-only transport does not make. */
export type Posting = Readonly<{
  post: (
    address: string,
    headers: Readonly<Record<string, string>>,
    body: string,
  ) => Promise<Readonly<{ status: number; text: () => Promise<string> }>>;
}>;

/** Who asks for an anonymous token: the app's id, its borrowed secret, and the device it attests, injected at runtime. */
export type Identity = Readonly<{ appId: number; appSecret: string; device: DeviceAuth }>;

/** The credentials a reader types, carried to the service under an anonymous token. */
export type Credentials = LoginRequest;

const asJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    throw new SessionError('malformed', 'le service a répondu ce qu’aucune lecture ne comprend');
  }
};

/** The error a non-200 reply carries: `refused` when the service names its refusal, `unavailable` otherwise. */
const refusal = (status: number, text: string): SessionError => {
  let named;
  try {
    named = SERVICE_ERROR.safeParse(JSON.parse(text));
  } catch {
    return new SessionError('unavailable', `le service a répondu ${String(status)}`);
  }
  return named.success
    ? new SessionError('refused', named.data.error.message)
    : new SessionError('unavailable', `le service a répondu ${String(status)}`);
};

/** A connection's three exchanges, each answering a token: the anonymous one, the user one, and both at once. */
export type Session = Readonly<{
  anonymousToken: () => Promise<string>;
  login: (credentials: Credentials, anonymous: string) => Promise<string>;
  open: (credentials: Credentials) => Promise<string>;
}>;

/**
 * A connection to the journal's service for one identity, over `ports`.
 *
 * `anonymousToken` opens the door the official app opens on launch; `login` carries a reader's credentials through it;
 * `open` does both, and is what a screen calls with what a reader typed. Each answers a token, or raises a
 * `SessionError` a screen can read — a wrong password is `refused`, a service that will not answer is `unavailable`.
 */
export const createSession = (identity: Identity, ports: Posting): Session => {
  const address = (path: string): string => `${SERVICE}${SERVICE_ROOT}${path}`;

  const anonymousToken = async (): Promise<string> => {
    const reply = await ports.post(
      address('/anonymous-token'),
      { 'content-type': 'text/plain' },
      JSON.stringify(
        ANONYMOUS_TOKEN_REQUEST.parse({
          app_id: identity.appId,
          app_secret: identity.appSecret,
          device_auth: identity.device,
        }),
      ),
    );
    const text = await reply.text();
    if (reply.status !== 200) {
      throw refusal(reply.status, text);
    }
    const read = ANONYMOUS_TOKEN_REPLY.safeParse(asJson(text));
    if (!read.success) {
      throw new SessionError('malformed', 'le service a répondu une forme inattendue au jeton anonyme');
    }
    return read.data.x_anonymous_token;
  };

  const login = async (credentials: Credentials, anonymous: string): Promise<string> => {
    const reply = await ports.post(
      address('/user/login'),
      { 'content-type': 'application/json', 'x-anonymous-token': anonymous },
      JSON.stringify(LOGIN_REQUEST.parse({ login: credentials.login, password: credentials.password })),
    );
    const text = await reply.text();
    if (reply.status !== 200) {
      throw refusal(reply.status, text);
    }
    const read = USER_TOKEN_REPLY.safeParse(asJson(text));
    if (!read.success) {
      throw new SessionError('malformed', 'le service a répondu une forme inattendue au jeton d’usager');
    }
    return read.data.x_user_token;
  };

  const open = async (credentials: Credentials): Promise<string> => login(credentials, await anonymousToken());

  return { anonymousToken, login, open };
};
