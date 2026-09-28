import { ContentApiError } from '@huma/contracts';
import type { ContentErrorCode } from '@huma/contracts';
import { beforeDeadline, DEADLINE } from './deadline.ts';
import type { Deadline } from './deadline.ts';
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
export type Ports<Signal> = Deadline<Signal> &
  Readonly<{
    /** Asks an address, and answers with the status of the reply and a way to read its body as text. */
    fetch: (
      address: string,
      init: Readonly<{ headers: Readonly<Record<string, string>>; signal: Signal }>,
    ) => Promise<Reply>;
    /**
     * The token a reader's own login earned, or none while nobody has signed in.
     *
     * It is asked anew at every request, and never held: the client is built once, when the app starts, and a reader
     * signs in and out long after — a token read at build time would be the one there was then, which is none.
     */
    token: () => string | undefined;
    /**
     * Hands over the token the service answered in place of `sent`, the one the request carried.
     *
     * The client keeps no token, so it keeps no successor either: whoever answers `token` decides what the next
     * request carries, and is told `sent` so that a reader who signed out while the request was on its way is not
     * signed back in by its answer.
     */
    renew: (sent: string, fresh: string) => void;
  }>;

/** What the client reads of a reply: its status, one of its headers by name, and its body as the text it arrived as. */
export type Reply = Readonly<{
  status: number;
  /** The value of the header `name`, whatever case either is written in, or `null` for a header the reply lacks. */
  header: (name: string) => string | null;
  text: () => Promise<string>;
}>;

/**
 * The name this client goes by, wherever the journal's services are told who asks: this one's own, and never the
 * official client's. The service reads it on every request; the journal's alerts read it on every subscription this
 * app makes to them (ADR-0043).
 */
export const CLIENT_NAME = 'humanite-lecteur (client non officiel)';

/**
 * What every request says of itself: that it wants JSON, in French, and which client asks — this one, under a name of
 * its own and never the official client's. Nothing else: no origin, no cookie, and none of the official client's own
 * tokens. ASCII only, OkHttp failing a request whose header carries any other byte.
 */
export const HEADERS = {
  accept: 'application/json',
  'accept-language': 'fr-FR',
  'user-agent': CLIENT_NAME,
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

/**
 * The cause a status of the service names, or `undefined` for a status that answered.
 *
 * A refusal is read together with what the request carried, because the same status means two opposite things. Asked
 * for by nobody, a 401 or a 403 says the thing is not this reader's to have. Asked for under a reader's own token, it
 * says the service no longer honours that token — the reader is a subscriber whose connection died — and the app has
 * something to do about it, which it has nothing to do about the other.
 */
export const causeOf = (status: number, underToken: boolean): ContentErrorCode | undefined => {
  if (status >= 200 && status < 300) {
    return undefined;
  }
  if (status === 401 || status === 403) {
    return underToken ? 'expired' : 'refused';
  }
  if (status === 404 || status === 410) {
    return 'not-found';
  }
  if (status === 408 || status === 429 || status >= 500) {
    return 'unavailable';
  }
  return 'malformed';
};

/** A reply read to the end of its body, with the token it handed back if it handed one. */
type Answered = Readonly<{ status: number; renewed: string | null; text: string }>;

/**
 * The token a reply hands back in place of `sent`, or `undefined` when it hands back none the client may take.
 *
 * The service slides a reader's token: a reply to a request made under one carries its successor, of the same reader
 * and the same device, good for two hours from then — measured on 27/09/2026 on every route the app reads but the
 * menu. Only a request that carried a token is answered with one the client takes: handed to a request that carried
 * none, it would be a token no login of this reader earned (ADR-0033, R4). A value OkHttp would refuse to send back
 * is not taken either, since every request after it would fail before leaving the phone.
 */
const successorOf = (sent: string | undefined, renewed: string | null): string | undefined =>
  sent !== undefined && renewed !== null && renewed !== '' && renewed !== sent && isSendable(renewed)
    ? renewed
    : undefined;

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
 *
 * A reply that answered hands back the token it slid the reader's to, and the client passes it on through `renew`,
 * as the official client takes it from every reply that succeeds. Left behind, the token the login earned is the one
 * every request carries until it dies, two hours after the login, however much the reader read in between.
 */
export const ask = async <Signal>(ports: Ports<Signal>, request: Request): Promise<unknown> => {
  const where = request.path;
  const reader = ports.token();
  const asked = reader === undefined ? request : signedIn(request);
  const headers = reader === undefined ? HEADERS : { ...HEADERS, [READER_HEADER]: reader };
  const answered = await beforeDeadline(
    ports,
    () => new ContentApiError('timeout', `${where} : aucune réponse en ${String(DEADLINE / 1000)} s`),
    async (signal): Promise<Answered> => {
      try {
        const reply = await ports.fetch(addressOf(asked), { headers, signal });
        return { status: reply.status, renewed: reply.header(READER_HEADER), text: await reply.text() };
      } catch {
        throw new ContentApiError('offline', `${where} : le service n’a pas été atteint`);
      }
    },
  );
  const cause = causeOf(answered.status, reader !== undefined);
  if (cause !== undefined) {
    throw new ContentApiError(cause, `${where} : statut ${String(answered.status)}`);
  }
  const successor = successorOf(reader, answered.renewed);
  if (reader !== undefined && successor !== undefined) {
    ports.renew(reader, successor);
  }
  try {
    const answer: unknown = JSON.parse(answered.text);
    return answer;
  } catch {
    throw new ContentApiError('unavailable', `${where} : réponse coupée en route`);
  }
};
