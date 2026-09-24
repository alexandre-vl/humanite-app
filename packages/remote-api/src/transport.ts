import { ContentApiError } from '@huma/contracts';
import type { ContentErrorCode } from '@huma/contracts';
import { addressOf } from './routes.ts';
import type { Request } from './routes.ts';

/**
 * What the client needs of the platform, handed in rather than reached for.
 *
 * A package bundled into the app is compiled with no `fetch`, no timer and no abort in sight, and a client that reached
 * for the global `fetch` would reach the network from every test that loaded it. So the door hands the platform's own
 * in, and a test hands in ones it drives. The signal is whatever the platform's request is cancelled by: the client
 * carries it from `abortable` to `fetch` and never looks inside.
 */
export type Ports<Signal> = Readonly<{
  /** Asks an address, and answers with the status of the reply and a way to read its body as text. */
  fetch: (
    address: string,
    init: Readonly<{ headers: Readonly<Record<string, string>>; signal: Signal }>,
  ) => Promise<Reply>;
  /** One request's way out: the signal that goes with it, and what lets it go. */
  abortable: () => Readonly<{ signal: Signal; abort: () => void }>;
  /** Runs `then` once `delay` milliseconds have passed, and answers with what cancels it. */
  after: (delay: number, then: () => void) => () => void;
  /**
   * The token a reader's own login earned, or none while nobody has signed in.
   *
   * It is asked anew at every request, and never held: the client is built once, when the app starts, and a reader
   * signs in and out long after — a token read at build time would be the one there was then, which is none.
   */
  token: () => string | undefined;
}>;

/** What the client reads of a reply: its status, and its body as the text it arrived as. */
export type Reply = Readonly<{ status: number; text: () => Promise<string> }>;

/**
 * How long a request is given before it is let go: fifteen seconds. A section's list the service had to build took 4.4
 * to 6.1 seconds on eight cold reads out of thirteen in a capture, and OkHttp gives the app's requests no limit at all.
 */
const DEADLINE = 15_000;

/**
 * What every request says of itself: that it wants JSON, in French, and which client asks — this one, under a name of
 * its own and never the official client's. Nothing else: no origin, no cookie, and none of the official client's own
 * tokens. ASCII only, OkHttp failing a request whose header carries any other byte.
 */
export const HEADERS = {
  accept: 'application/json',
  'accept-language': 'fr-FR',
  'user-agent': 'humanite-lecteur (client non officiel)',
} as const;

/** The one header a request adds to those, and only for a token a reader's own login earned (ADR-0032). */
const READER_HEADER = 'x-user-token';

/**
 * The same request, as a reader who signed in asks it: without `ano`, the flag that says nobody had.
 *
 * The official client sends `ano` exactly when it sends no token — 74 requests of 74 in its capture — so the two go
 * together the other way round too. A request carrying both would hold a reader out and present them in one breath,
 * and the service is under no obligation to prefer either.
 */
const signedIn = (request: Request): Request => ({
  path: request.path,
  query: request.query.filter(([name]) => name !== 'ano'),
});

/** Whether a header's value is one OkHttp will send: printable ASCII, and nothing else — an accent fails the request. */
export const isSendable = (value: string): boolean => /^[\x20-\x7e]*$/u.test(value);

/** The cause a status of the service names, or `undefined` for a status that answered. */
export const causeOf = (status: number): ContentErrorCode | undefined => {
  if (status >= 200 && status < 300) {
    return undefined;
  }
  if (status === 401 || status === 403) {
    return 'refused';
  }
  if (status === 404 || status === 410) {
    return 'not-found';
  }
  if (status === 408 || status === 429 || status >= 500) {
    return 'unavailable';
  }
  return 'malformed';
};

/** A reply read to the end of its body. */
type Answered = Readonly<{ status: number; text: string }>;

/**
 * Asks the service, and answers with what it said — or fails, naming the cause.
 *
 * The cause is read off the client's own state, never off the error the platform throws: its `fetch` rejects a request
 * let go by the deadline and one that never left the phone with errors told apart only by their message. So the
 * deadline is the client's, raced against the request rather than left to the platform to honour; a failure before it
 * is `offline`; a status names the rest; and a body that does not parse, from a service that only answers JSON, was
 * cut on the way — which the platform can hand over under a 200 — and is `unavailable`, which another try can mend.
 *
 * A reader who signed in is asked for as themselves: their token goes out with the request and the flag that says
 * nobody signed in comes off it. The service decides the rest — what a subscription pays for is granted there and
 * read off `right`, never inferred here from the fact that a token was sent.
 */
export const ask = async <Signal>(ports: Ports<Signal>, request: Request): Promise<unknown> => {
  const control = ports.abortable();
  const where = request.path;
  const reader = ports.token();
  const asked = reader === undefined ? request : signedIn(request);
  const headers = reader === undefined ? HEADERS : { ...HEADERS, [READER_HEADER]: reader };
  let cancel = (): void => undefined;
  const deadline = new Promise<never>((...[, reject]) => {
    cancel = ports.after(DEADLINE, () => {
      control.abort();
      reject(new ContentApiError('timeout', `${where} : aucune réponse en ${String(DEADLINE / 1000)} s`));
    });
  });
  const attempt = (async (): Promise<Answered> => {
    try {
      const reply = await ports.fetch(addressOf(asked), { headers, signal: control.signal });
      return { status: reply.status, text: await reply.text() };
    } catch {
      throw new ContentApiError('offline', `${where} : le service n’a pas été atteint`);
    }
  })();
  const answered = await Promise.race([attempt, deadline]).finally(cancel);
  const cause = causeOf(answered.status);
  if (cause !== undefined) {
    throw new ContentApiError(cause, `${where} : statut ${String(answered.status)}`);
  }
  try {
    const answer: unknown = JSON.parse(answered.text);
    return answer;
  } catch {
    throw new ContentApiError('unavailable', `${where} : réponse coupée en route`);
  }
};
