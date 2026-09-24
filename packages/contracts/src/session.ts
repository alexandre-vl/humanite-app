import { z } from 'zod';

/**
 * The wire shapes of a subscriber's connection to the journal's service, as the official app opens it.
 *
 * Like the shapes in `remote.ts`, these are the service's own — snake_case, unbranded, measured on a capture of the
 * official app signed in (2026-09-24), never guessed. A reading turns one into the domain type the app holds, and that
 * reading is the only place the service's vocabulary and the app's meet.
 *
 * The connection is two exchanges. `POST /anonymous-token` gives a device, attested, an anonymous token; `POST
 * /user/login`, carrying that token, gives a signed-in reader a user token. The app then reads with the user token,
 * and the service opens the bodies that reader's subscription pays for (ADR-0032).
 */

/** The attestation a device sends for its anonymous token: how the official client identifies the device it runs on. */
const DEVICE_AUTH = z.object({
  description: z.string(),
  os: z.string(),
  token: z.object({ crypt_mode: z.string(), crypt_value: z.string() }),
});
export type DeviceAuth = z.infer<typeof DEVICE_AUTH>;

/** The body of `POST /anonymous-token`: the app's id and its borrowed secret, and the device that asks. */
export const ANONYMOUS_TOKEN_REQUEST = z.object({
  app_id: z.number(),
  app_secret: z.string(),
  device_auth: DEVICE_AUTH,
});

/** What `POST /anonymous-token` answers: the token every later request carries until a reader signs in. */
export const ANONYMOUS_TOKEN_REPLY = z.object({ x_anonymous_token: z.string().min(1) });

/** The body of `POST /user/login`: the credentials a reader types, sent under the anonymous token. */
export const LOGIN_REQUEST = z.object({ login: z.string(), password: z.string() });
export type LoginRequest = z.infer<typeof LOGIN_REQUEST>;

/** What `POST /user/login` answers a reader it recognises: the token that stands for their open session. */
export const USER_TOKEN_REPLY = z.object({ x_user_token: z.string().min(1) });

/**
 * What the service answers when it will not do what was asked: a code and a message, both its own. `10053` is the
 * login it refused — wrong credentials — and `10016` the request it refused to read at all, sent with no anonymous
 * token. The message is the service's French, shown to no reader as it comes.
 */
export const SERVICE_ERROR = z.object({ error: z.object({ code: z.number(), message: z.string() }) });
