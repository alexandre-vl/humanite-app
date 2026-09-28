import { ARTICLE_ID, ContentApiError, QUESTION } from '@huma/contracts';
import type { ContentApi, ContentErrorCode, Finding } from '@huma/contracts';
import type { Client } from './api.ts';
import { RECORDINGS, replayed, reply } from './bench.ts';
import { routeAt } from './routes.ts';
import type { RouteName } from './routes.ts';
import { isSendable } from './transport.ts';
import type { Reply } from './transport.ts';

/** The name of one thing a client of the service can get wrong. */
export type TransportCode =
  | 'transport/no-deadline'
  | 'transport/hangs'
  | 'transport/connection-held'
  | 'transport/cause-misnamed'
  | 'transport/impersonates'
  | 'transport/reader-unnamed'
  | 'transport/expiry-misread'
  | 'transport/address-unknown'
  | 'transport/renewal-dropped'
  | 'transport/renewal-unearned';

/** The signal the judging hands a client: a number, which is all it takes to tell one request's way out from another. */
type Token = number;

/** A way of making a client from what it is handed, which is what the judging below is handed rather than reaching for. */
export type Make = (client: Client<Token>) => ContentApi;

/** What a request of the client looked like when it left: where it went, what it said of itself, and its way out. */
type Asked = Readonly<{ address: string; headers: Readonly<Record<string, string>>; signal: Token }>;

/** What a request gets from the bench: a reply, or nothing at all until its way out is used. */
type Answer = (address: string, headers: Readonly<Record<string, string>>) => Promise<Reply> | 'hang';

/**
 * Ports the judging drives, with what they saw: every request, the requests left without an answer, every deadline
 * set, every request let go, and every token the client passed on in place of the one it sent.
 */
type Bench = Readonly<{
  client: Client<Token>;
  asked: Asked[];
  hung: Token[];
  timers: (() => void)[];
  aborted: Set<Token>;
  renewed: (readonly [string, string])[];
}>;

const benchOf = (answer: Answer, reader?: string): Bench => {
  const asked: Asked[] = [];
  const hung: Token[] = [];
  const timers: (() => void)[] = [];
  const aborted = new Set<Token>();
  const renewed: (readonly [string, string])[] = [];
  const letGo = new Map<Token, () => void>();
  let next = 0;
  const client: Client<Token> = {
    fetch: async (address, init) => {
      asked.push({ address, headers: init.headers, signal: init.signal });
      const answered = answer(address, init.headers);
      if (answered !== 'hang') {
        return answered;
      }
      hung.push(init.signal);
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
    token: () => reader,
    renew: (sent, fresh) => {
      renewed.push([sent, fresh]);
    },
  };
  return { client, asked, hung, timers, aborted, renewed };
};

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

/** The article the judging asks for: the first one the capture recorded, under the id its path files it under. */
const ASKED_ARTICLE = ARTICLE_ID.parse(RECORDINGS.article[0]?.path.split('/').at(-1));

/**
 * How the judging makes a client ask each route of the service: the way the app does, a section's list through the
 * menu that files it.
 *
 * Every check reads every route, and not the one it was first written against: a client bent only where it asks for
 * an article — a second client built for it without a deadline, a failure named alike, a header of its own — passed a
 * judging that read the wire alone. The record takes a route the client comes to ask as one more reading to write
 * here, or the judging does not compile.
 */
const READINGS: Readonly<Record<RouteName, (api: ContentApi) => Promise<unknown>>> = {
  front: async (api) => api.getFeed({}),
  wire: async (api) => api.getLiveFeed({}),
  menu: async (api) => api.getSections(),
  section: async (api) => {
    const [first] = await api.getSections();
    if (first === undefined) {
      throw new Error('le menu que le banc rejoue ne tient aucune rubrique');
    }
    return api.getFeed({ section: first.id });
  },
  article: async (api) => api.getArticle(ASKED_ARTICLE),
  search: async (api) => api.search({ text: QUESTION.parse('climat') }),
};

/** The routes, each with the reading that asks it. */
const EVERY_ROUTE = Object.entries(READINGS);

/**
 * The service answering one route as `answer` says, and every other as the capture recorded: a section's list is
 * asked through a menu that has to answer first, so a route is judged on its own request and nothing else. An address
 * of no route at all is the judged route's too — a client that bends its address is still held to its deadline and
 * its causes, and the addresses have their own check.
 */
const only =
  (route: string, answer: Answer): Answer =>
  (address, headers): Promise<Reply> | 'hang' => {
    const at = routeAt(address);
    return at !== undefined && at.route !== route ? replayed(address) : answer(address, headers);
  };

/** A list of what went wrong on which route, as a finding says it — or no finding at all when nothing did. */
const saying = (code: TransportCode, what: string, where: readonly string[]): readonly Finding<TransportCode>[] =>
  where.length === 0 ? [] : [{ code, says: `${what} : ${where.join(' ; ')}` }];

/**
 * A request the service never answers must end, and let its connection go. The platform gives a request no limit of
 * its own, and a connection held is one of the five a host allows the app at once.
 */
const deadline = async (make: Make): Promise<readonly Finding<TransportCode>[]> => {
  const unbounded: string[] = [];
  const hanging: string[] = [];
  const held: string[] = [];
  for (const [route, read] of EVERY_ROUTE) {
    const { client, hung, timers, aborted } = benchOf(only(route, () => 'hang'));
    const outcome = watch(read(make(client)));
    await settle();
    if (timers.length === 0) {
      unbounded.push(route);
      continue;
    }
    for (const fire of [...timers]) {
      fire();
    }
    await settle();
    if (outcome().kind === 'pending') {
      hanging.push(route);
    }
    if (!hung.every((signal) => aborted.has(signal))) {
      held.push(route);
    }
  }
  return [
    ...saying('transport/no-deadline', 'une requête sans réponse est partie sans délai', unbounded),
    ...saying('transport/hangs', 'le délai passé, la lecture attend encore', hanging),
    ...saying('transport/connection-held', 'le délai passé, la requête n’a pas été lâchée', held),
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
const causes = async (make: Make): Promise<readonly Finding<TransportCode>[]> => {
  const misnamed: string[] = [];
  for (const [route, read] of EVERY_ROUTE) {
    for (const { says, answer, cause } of CAUSES) {
      const { client, timers } = benchOf(only(route, answer));
      const outcome = watch(read(make(client)));
      await settle();
      for (const fire of [...timers]) {
        fire();
      }
      await settle();
      const ended = outcome();
      if (ended.kind === 'answered' || (ended.kind === 'failed' && ended.cause !== cause)) {
        misnamed.push(
          `${route}, ${says} : ${ended.kind === 'failed' ? String(ended.cause) : 'lu comme une réponse'} au lieu de ${cause}`,
        );
      }
    }
  }
  return saying('transport/cause-misnamed', 'des échecs sous le nom d’une autre cause', misnamed);
};

/**
 * A reader whose connection the service no longer honours is told so, rather than told the thing is not theirs.
 *
 * One status carries both: a 403 to nobody says an article is kept for subscribers, and a 403 under a reader's own
 * token says that token is dead. A client that read the second as the first would sit a paying subscriber in front of
 * the wall they pay to pass, and nothing downstream — not the screen, not the app holding the token — could tell that
 * signing in again is what mends it. So the judging asks every route under a reader whose token the service refuses,
 * and holds the client to naming that case apart.
 */
const staleness = async (make: Make): Promise<readonly Finding<TransportCode>[]> => {
  const misread: string[] = [];
  for (const [route, read] of EVERY_ROUTE) {
    const { client, timers } = benchOf(
      only(route, async () => reply(403, '{}')),
      READER,
    );
    const outcome = watch(read(make(client)));
    await settle();
    for (const fire of [...timers]) {
      fire();
    }
    await settle();
    const ended = outcome();
    if (!(ended.kind === 'failed' && ended.cause === 'expired')) {
      misread.push(
        `${route} : ${ended.kind === 'failed' ? String(ended.cause) : 'lu comme une réponse'} au lieu de expired`,
      );
    }
  }
  return saying('transport/expiry-misread', 'des jetons morts lus comme un refus', misread);
};

/** Every request the client makes when each of its routes is read once, the service answering as the capture did. */
const askedOfEveryRoute = async (make: Make, reader?: string): Promise<readonly Asked[]> => {
  const { client, asked } = benchOf(replayed, reader);
  const api = make(client);
  await Promise.allSettled(EVERY_ROUTE.map(async ([, read]) => read(api)));
  return asked;
};

/**
 * The token the judging hands a client as one a reader's own login earned. Nothing of the official client's is in it:
 * what the judging is looking for is whether the client carries the token it was given, and only that one.
 */
const READER = 'jeton-de-labonne';

/** Every request the client makes, asked twice over: once with nobody signed in, once with a reader who has. */
type Round = Readonly<{ asked: readonly Asked[]; reader: string | undefined }>;

const askedBothWays = async (make: Make): Promise<readonly Round[]> => [
  { asked: await askedOfEveryRoute(make), reader: undefined },
  { asked: await askedOfEveryRoute(make, READER), reader: READER },
];

/** The names a query carries, in any order and without the empty one a leading `&` leaves. */
const namesOf = (query: string): ReadonlySet<string> =>
  new Set(
    query
      .replace(/^\?/u, '')
      .split('&')
      .filter((pair) => pair !== '')
      .map((pair) => pair.split('=')[0] ?? ''),
  );

/** What the official client's name is made of, which no request of this one may carry. */
const OFFICIAL = /immanens|hybride/iu;

/** The headers that would speak for someone: a browser's origin, a session, the official client's own way in. */
const SPEAKING = ['origin', 'cookie', 'x-anonymous-token', 'customer-hash', 'customer-data'];

/** The one header a request may carry for a reader, and only ever the token that reader's own login earned. */
const READER_HEADER = 'x-user-token';

/** What `headers` holds under `name`, whatever case it was written in, or `undefined` for a header it does not hold. */
const valueOf = (headers: Readonly<Record<string, string>>, name: string): string | undefined =>
  Object.entries(headers).find(([held]) => held.toLowerCase() === name)?.[1];

/**
 * A request says which client it comes from, under a name of its own, and carries no credentials but the ones this
 * reader's own login earned.
 *
 * The user token is the one header the client may add, and what makes it honest is where it came from: the judging
 * hands the client a token and looks for that token and no other. A client carrying one while nobody has signed in
 * minted it from somewhere — the official client's key being the only somewhere there is — which is the thing
 * ADR-0032 keeps out of a delivered client, whatever a subscriber may ask it to fetch for them.
 */
const honesty = (rounds: readonly Round[]): readonly Finding<TransportCode>[] =>
  saying(
    'transport/impersonates',
    'des requêtes qui parlent pour un autre',
    rounds.flatMap(({ asked, reader }) =>
      asked.flatMap(({ address, headers }) => {
        const agent = valueOf(headers, 'user-agent');
        const carried = valueOf(headers, READER_HEADER);
        const problems = [
          ...(agent === undefined ? ['aucun nom'] : []),
          ...(agent !== undefined && OFFICIAL.test(agent) ? [`le nom du client officiel (« ${agent} »)`] : []),
          ...(agent !== undefined && !isSendable(agent) ? ['un nom qu’OkHttp refuse, hors ASCII'] : []),
          ...Object.keys(headers)
            .filter((name) => SPEAKING.includes(name.toLowerCase()))
            .map((name) => `l’en-tête « ${name} »`),
          ...(carried !== undefined && carried !== reader ? ['un jeton d’usager qu’aucune connexion n’a gagné'] : []),
        ];
        return problems.length === 0 ? [] : [`${address} porte ${problems.join(', ')}`];
      }),
    ),
  );

/**
 * A reader who signed in is asked for as themselves, on every route.
 *
 * Their token goes out with the request, and `ano` — the flag that says nobody signed in — comes off it. A request
 * that drops either asks the service for what a subscription pays for while telling it there is no subscriber, and
 * the service answers what it was asked: `right` false, the article withheld, the reader paying for nothing. It is
 * the quiet half of the same rule the honesty above keeps: the loud half is carrying a token nobody earned.
 */
const named = (rounds: readonly Round[]): readonly Finding<TransportCode>[] =>
  saying(
    'transport/reader-unnamed',
    'des requêtes d’un abonné connecté qui ne le disent pas',
    rounds.flatMap(({ asked, reader }) =>
      reader === undefined
        ? []
        : asked.flatMap(({ address, headers }) => {
            const problems = [
              ...(valueOf(headers, READER_HEADER) === undefined ? ['le jeton de l’abonné manque'] : []),
              ...(namesOf(routeAt(address)?.query ?? '').has('ano') ? ['le drapeau « ano » y est resté'] : []),
            ];
            return problems.length === 0 ? [] : [`${address} : ${problems.join(', ')}`];
          }),
    ),
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

/**
 * A request goes where the official client's went: a route the service was seen to answer, with the query it was seen
 * to answer it with. An address of any other shape is one no capture holds an answer for, and a guess.
 */
const addresses = (rounds: readonly Round[]): readonly Finding<TransportCode>[] =>
  saying(
    'transport/address-unknown',
    'adresses qu’aucune capture ne connaît',
    rounds.flatMap(({ asked }) =>
      asked.flatMap(({ address }) => {
        const at = routeAt(address);
        if (at === undefined) {
          return [address];
        }
        const heard = RECORDINGS[at.route].map((each) => besidesAno(namesOf(each.query)));
        return heard.includes(besidesAno(namesOf(at.query))) ? [] : [address];
      }),
    ),
  );

/** The token the judging's service slides a reader's to, in the header the service writes it in. */
const SUCCESSOR = 'jeton-glisse';

/**
 * The capture's own answer to a request, carrying a successor token: to a request that carried `reader`'s token, as
 * the service slides it; or to every request whatever it carried, when `reader` is nobody — what no service should
 * send, and what a client must not believe.
 */
const sliding =
  (reader: string | undefined): Answer =>
  async (address, headers): Promise<Reply> => {
    const recorded = await replayed(address);
    return reader === undefined || valueOf(headers, READER_HEADER) === reader
      ? { ...recorded, header: (name) => (name.toLowerCase() === READER_HEADER ? SUCCESSOR : recorded.header(name)) }
      : recorded;
  };

/** Asks one route through `make`'s client over `answer`, and answers with the bench once every step it can take is taken. */
const readOnce = async (
  make: Make,
  read: (api: ContentApi) => Promise<unknown>,
  answer: Answer,
  reader?: string,
): Promise<Readonly<{ bench: Bench; outcome: Outcome }>> => {
  const bench = benchOf(answer, reader);
  const outcome = watch(read(make(bench.client)));
  await settle();
  for (const fire of [...bench.timers]) {
    fire();
  }
  await settle();
  return { bench, outcome: outcome() };
};

/**
 * A reader's token slides, and only a reader's does.
 *
 * The service answers a request made under a reader's token with its successor, good for two hours from then, and a
 * client that drops it leaves the reader on the token their login earned until that one dies — two hours after the
 * login, however much they read in between. So the judging slides the reader's token on every route, and holds a
 * read that answered under it to passing the successor on in place of the token sent. It then hands a successor to
 * every request of a reader nobody signed in, and holds the client to taking none: handed to a request that carried
 * no token, it is a token no login of this reader earned.
 */
const renewal = async (make: Make): Promise<readonly Finding<TransportCode>[]> => {
  const dropped: string[] = [];
  const unearned: string[] = [];
  for (const [route, read] of EVERY_ROUTE) {
    const under = await readOnce(make, read, only(route, sliding(READER)), READER);
    const handed = under.bench.asked.some(
      ({ address, headers }) => routeAt(address)?.route === route && valueOf(headers, READER_HEADER) === READER,
    );
    const passed = under.bench.renewed.some(([sent, fresh]) => sent === READER && fresh === SUCCESSOR);
    if (under.outcome.kind === 'answered' && handed && !passed) {
      dropped.push(route);
    }
    const nobody = await readOnce(make, read, only(route, sliding(undefined)));
    if (nobody.bench.renewed.length > 0) {
      unearned.push(route);
    }
  }
  return [
    ...saying('transport/renewal-dropped', 'des jetons neufs laissés au service', dropped),
    ...saying(
      'transport/renewal-unearned',
      'des jetons neufs pris par des requêtes qui n’en portaient aucun',
      unearned,
    ),
  ];
};

/**
 * Whether a client of the service ends every request, names every failure by its cause, speaks for itself alone,
 * speaks for a reader who signed in, passes on the token the service slides theirs to, and asks only the addresses
 * the official client was seen to ask — on every route it reads, with nobody signed in and with a reader who is.
 *
 * The client is handed in rather than reached for, so a fixture can hand in one that sets no deadline, or lets its
 * deadline pass doing nothing, or keeps a connection it gave up on, or names every failure alike, or reads a dead
 * token as a refusal, or borrows the official client's name, or carries a token no login earned, or leaves a
 * signed-in reader's token behind, or drops the token the service slides it to, or takes one handed to nobody, or
 * asks an address of its own making — or does any of it on one route alone — and read the code that comes back.
 */
export const judgeTransport = async (make: Make): Promise<readonly Finding<TransportCode>[]> => {
  const rounds = await askedBothWays(make);
  return [
    ...(await deadline(make)),
    ...(await causes(make)),
    ...(await staleness(make)),
    ...honesty(rounds),
    ...named(rounds),
    ...(await renewal(make)),
    ...addresses(rounds),
  ];
};
