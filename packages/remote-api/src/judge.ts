import { ARTICLE_ID, ContentApiError } from '@huma/contracts';
import type { ContentApi, ContentErrorCode } from '@huma/contracts';
import type { Client } from './api.ts';
import { RECORDED } from './recorded.ts';
import { routeOf, SERVICE, SERVICE_ROOT } from './routes.ts';
import type { RouteName } from './routes.ts';
import type { Reply } from './transport.ts';

/**
 * The name of one thing a client of the service can get wrong. A union rather than a list, nothing ever walking the
 * codes: a judging names each it finds, and a fixture names the set it expects.
 */
export type TransportCode =
  | 'transport/no-deadline'
  | 'transport/hangs'
  | 'transport/connection-held'
  | 'transport/cause-misnamed'
  | 'transport/impersonates'
  | 'transport/address-unknown';

/** One thing a judging found wrong, and what it asked to find it out. */
export type TransportFinding = Readonly<{ code: TransportCode; says: string }>;

/** The signal the judging hands a client: a number, which is all it takes to tell one request's way out from another. */
type Token = number;

/** A way of making a client from what it is handed, which is what the judging below is handed rather than reaching for. */
export type Make = (client: Client<Token>) => ContentApi;

/** What a request of the client looked like when it left: where it went, what it said of itself, and its way out. */
type Asked = Readonly<{ address: string; headers: Readonly<Record<string, string>>; signal: Token }>;

/** What a request gets from the bench: a reply, or nothing at all until its way out is used. */
type Answer = (address: string) => Promise<Reply> | 'hang';

/** Ports the judging drives, with what they saw: every request, every deadline set, every request let go. */
type Bench = Readonly<{ client: Client<Token>; asked: Asked[]; timers: (() => void)[]; aborted: Set<Token> }>;

const benchOf = (answer: Answer): Bench => {
  const asked: Asked[] = [];
  const timers: (() => void)[] = [];
  const aborted = new Set<Token>();
  const letGo = new Map<Token, () => void>();
  let next = 0;
  const client: Client<Token> = {
    fetch: async (address, init) => {
      asked.push({ address, headers: init.headers, signal: init.signal });
      const reply = answer(address);
      if (reply !== 'hang') {
        return reply;
      }
      return new Promise<Reply>((...[, reject]) => {
        letGo.set(init.signal, () => {
          reject(new Error('requête lâchée'));
        });
      });
    },
    abortable: () => {
      next += 1;
      const signal = next;
      return {
        signal,
        abort: () => {
          aborted.add(signal);
          letGo.get(signal)?.();
        },
      };
    },
    after: (...[, then]) => {
      timers.push(then);
      return () => {
        const at = timers.indexOf(then);
        if (at >= 0) {
          timers.splice(at, 1);
        }
      };
    },
    setAside: () => undefined,
  };
  return { client, asked, timers, aborted };
};

/** A reply of the bench: a status, and a body read as the text it arrives as. */
const reply = async (status: number, text: string): Promise<Reply> =>
  Promise.resolve({ status, text: async () => Promise.resolve(text) });

/** Enough turns of the microtask queue for a request under way to take every step it can take without a timer. */
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 100; turn += 1) {
    await Promise.resolve();
  }
};

/** How a read ended, read without waiting on it: still under way, answered, or failed with the cause it named. */
type Outcome =
  | Readonly<{ kind: 'pending' }>
  | Readonly<{ kind: 'answered' }>
  | Readonly<{ kind: 'failed'; cause: ContentErrorCode | null }>;

const watch = (read: Promise<unknown>): (() => Outcome) => {
  let outcome: Outcome = { kind: 'pending' };
  void read.then(
    () => {
      outcome = { kind: 'answered' };
    },
    (error: unknown) => {
      outcome = { kind: 'failed', cause: error instanceof ContentApiError ? error.code : null };
    },
  );
  return () => outcome;
};

/** A list of the service holding nothing: what the wire answers when it is asked and all goes well. */
const EMPTY_LIST = JSON.stringify({ posts: [] });

/**
 * A request the service never answers must end, and let its connection go. The platform gives a request no limit of
 * its own, and a connection held is one of the five a host allows the app at once.
 */
const deadline = async (make: Make): Promise<readonly TransportFinding[]> => {
  const { client, asked, timers, aborted } = benchOf(() => 'hang');
  const outcome = watch(make(client).getLiveFeed({}));
  await settle();
  if (timers.length === 0) {
    return [{ code: 'transport/no-deadline', says: 'une requête sans réponse est partie sans délai' }];
  }
  for (const fire of [...timers]) {
    fire();
  }
  await settle();
  return [
    ...(outcome().kind === 'pending'
      ? [{ code: 'transport/hangs' as const, says: 'le délai passé, la lecture attend encore' }]
      : []),
    ...(asked.every((each) => aborted.has(each.signal))
      ? []
      : [{ code: 'transport/connection-held' as const, says: 'le délai passé, la requête n’a pas été lâchée' }]),
  ];
};

/** What the service can do to a request, and the cause each must be named by. */
const CAUSES: readonly Readonly<{ says: string; answer: Answer; cause: ContentErrorCode }>[] = [
  { says: 'le service injoignable', answer: async () => Promise.reject(new Error('fetch failed')), cause: 'offline' },
  { says: 'aucune réponse', answer: () => 'hang', cause: 'timeout' },
  { says: 'un statut 401', answer: async () => reply(401, '{}'), cause: 'refused' },
  { says: 'un statut 403', answer: async () => reply(403, '{}'), cause: 'refused' },
  { says: 'un statut 404', answer: async () => reply(404, '{}'), cause: 'not-found' },
  { says: 'un statut 429', answer: async () => reply(429, ''), cause: 'unavailable' },
  { says: 'un statut 503', answer: async () => reply(503, ''), cause: 'unavailable' },
  { says: 'une réponse coupée', answer: async () => reply(200, '{"posts":[{"id":'), cause: 'unavailable' },
  { says: 'une réponse sans liste', answer: async () => reply(200, '{"erreur":true}'), cause: 'malformed' },
  { says: 'une redirection non suivie', answer: async () => reply(302, '<html></html>'), cause: 'malformed' },
];

/**
 * A failure must carry the cause that made it, which decides what a reader is told and whether asking again can help.
 * A read still under way is the deadline's to judge, and is not counted here.
 */
const causes = async (make: Make): Promise<readonly TransportFinding[]> => {
  const misnamed: string[] = [];
  for (const { says, answer, cause } of CAUSES) {
    const { client, timers } = benchOf(answer);
    const outcome = watch(make(client).getLiveFeed({}));
    await settle();
    for (const fire of [...timers]) {
      fire();
    }
    await settle();
    const ended = outcome();
    if (ended.kind === 'answered' || (ended.kind === 'failed' && ended.cause !== cause)) {
      misnamed.push(
        `${says} : ${ended.kind === 'failed' ? String(ended.cause) : 'lu comme une réponse'} au lieu de ${cause}`,
      );
    }
  }
  return misnamed.length === 0 ? [] : [{ code: 'transport/cause-misnamed', says: misnamed.join(' ; ') }];
};

/** What the official client's name is made of, which no request of this one may carry. */
const OFFICIAL = /immanens|hybride/iu;

/** The headers that would speak for someone: a browser's origin, a session, a reader's account. */
const SPEAKING = ['origin', 'cookie', 'x-user-token', 'x-anonymous-token', 'customer-hash', 'customer-data'];

/** A request says which client it comes from, under a name of its own, and carries no one's credentials. */
const honesty = async (make: Make): Promise<readonly TransportFinding[]> => {
  const { client, asked } = benchOf(async () => reply(200, EMPTY_LIST));
  await make(client).getLiveFeed({});
  const found = asked.flatMap(({ address, headers }) => {
    const agent = Object.entries(headers).find(([name]) => name.toLowerCase() === 'user-agent')?.[1];
    const problems = [
      ...(agent === undefined ? ['aucun nom'] : []),
      ...(agent !== undefined && OFFICIAL.test(agent) ? [`le nom du client officiel (« ${agent} »)`] : []),
      ...(agent !== undefined && !/^[\x20-\x7e]*$/u.test(agent) ? ['un nom qu’OkHttp refuse, hors ASCII'] : []),
      ...Object.keys(headers)
        .filter((name) => SPEAKING.includes(name.toLowerCase()))
        .map((name) => `l’en-tête « ${name} »`),
    ];
    return problems.length === 0 ? [] : [`${address} porte ${problems.join(', ')}`];
  });
  return found.length === 0 ? [] : [{ code: 'transport/impersonates', says: found.join(' ; ') }];
};

/** What the capture recorded for each route: what a replay answers with, and what an address is held to. */
const RECORDINGS: Readonly<Record<RouteName, readonly Readonly<{ path: string; query: string; answer: unknown }>[]>> = {
  front: [RECORDED.front],
  wire: [RECORDED.wire],
  menu: [RECORDED.menu],
  section: [RECORDED.section],
  search: [RECORDED.search],
  article: Object.values(RECORDED.articles),
};

/** The names a query carries, in any order and without the empty one a leading `&` leaves. */
const namesOf = (query: string): ReadonlySet<string> =>
  new Set(
    query
      .replace(/^\?/u, '')
      .split('&')
      .filter((pair) => pair !== '')
      .map((pair) => pair.split('=')[0] ?? ''),
  );

/**
 * What the query names apart from `ano`, the flag a reader nobody signed in sends. The official client sends it on
 * every request it makes without a token, and its capture made every article request with one, so an anonymous request
 * of an article is the one place the two may differ.
 */
const besidesAno = (names: ReadonlySet<string>): string =>
  [...names]
    .filter((name) => name !== 'ano')
    .sort((left, right) => left.localeCompare(right))
    .join('&');

/** An address the client asked, cut into the path under the service's root and the query; `null` off the service. */
const partsOf = (address: string): Readonly<{ path: string; query: string }> | null => {
  const root = `${SERVICE}${SERVICE_ROOT}`;
  if (!address.startsWith(`${root}/`)) {
    return null;
  }
  const [path = '', query = ''] = address.slice(root.length).split('?');
  return { path, query };
};

/** A replay of the capture: each route answered with what it answered then, and anything else with a 404. */
const replay: Answer = async (address) => {
  const parts = partsOf(address);
  const route = parts === null ? undefined : routeOf(parts.path);
  const [kept] = route === undefined ? [] : RECORDINGS[route];
  return kept === undefined ? reply(404, '{}') : reply(200, JSON.stringify(kept.answer));
};

/**
 * A request goes where the official client's went: a route the service was seen to answer, with the query it was seen
 * to answer it with. An address of any other shape is one no capture holds an answer for, and a guess.
 */
const addresses = async (make: Make): Promise<readonly TransportFinding[]> => {
  const { client, asked } = benchOf(replay);
  const api = make(client);
  const [first] = await api.getSections().catch(() => []);
  const [recorded] = RECORDINGS.article;
  const filed = recorded?.path.split('/').at(-1) ?? '';
  await Promise.allSettled([
    api.getFeed({}),
    ...(first === undefined ? [] : [api.getFeed({ section: first.id })]),
    api.getLiveFeed({}),
    api.search({ text: 'climat' }),
    ...(ARTICLE_ID.safeParse(filed).success ? [api.getArticle(ARTICLE_ID.parse(filed))] : []),
  ]);
  const unknown = asked.flatMap(({ address }) => {
    const parts = partsOf(address);
    const route = parts === null ? undefined : routeOf(parts.path);
    if (parts === null || route === undefined) {
      return [address];
    }
    const heard = RECORDINGS[route].map((each) => besidesAno(namesOf(each.query)));
    return heard.includes(besidesAno(namesOf(parts.query))) ? [] : [address];
  });
  return unknown.length === 0
    ? []
    : [{ code: 'transport/address-unknown', says: `adresses qu’aucune capture ne connaît : ${unknown.join(' ; ')}` }];
};

/**
 * Whether a client of the service ends every request, names every failure by its cause, speaks for itself alone, and
 * asks only the addresses the official client was seen to ask.
 *
 * The client is handed in rather than reached for, so a fixture can hand in one that sets no deadline, or lets its
 * deadline pass doing nothing, or keeps a connection it gave up on, or names every failure alike, or borrows the
 * official client's name, or asks an address of its own making — and read the code that comes back.
 */
export const judgeTransport = async (make: Make): Promise<readonly TransportFinding[]> => [
  ...(await deadline(make)),
  ...(await causes(make)),
  ...(await honesty(make)),
  ...(await addresses(make)),
];
