import { ARTICLE_ID, ContentApiError, QUESTION, SECTION_ID, SECTIONS_KEY } from '@huma/contracts';
import type { ContentErrorCode, SetAside } from '@huma/contracts';
import { expect, test } from 'vitest';
import { createRemoteApi } from './api.ts';
import type { Client } from './api.ts';
import { replayed, reply } from './bench.ts';
import { RECORDED } from './recorded.ts';
import { routeAt, SERVICE, SERVICE_ROOT } from './routes.ts';
import type { RouteName } from './routes.ts';
import type { Reply } from './transport.ts';

/** A reply of the service holding `body`, written as the JSON it arrives as. */
const json = async (status: number, body: unknown): Promise<Reply> => reply(status, JSON.stringify(body));

/**
 * A client over a replay of the capture, which `answer` may take a route of over; every address asked and every item
 * set aside is kept for the test to read.
 */
const replaying = (answer?: (route: RouteName, query: string) => Promise<Reply> | undefined, reader?: string) => {
  const asked: string[] = [];
  const carried: Readonly<Record<string, string>>[] = [];
  const setAside: (readonly [RouteName, readonly SetAside[]])[] = [];
  const client: Client<number> = {
    fetch: async (address, init) => {
      asked.push(address);
      carried.push(init.headers);
      const at = routeAt(address);
      return (at === undefined ? undefined : answer?.(at.route, at.query)) ?? replayed(address);
    },
    abortable: () => ({ signal: 0, abort: () => undefined }),
    after: () => () => undefined,
    setAside: (route, items) => {
      setAside.push([route, items]);
    },
    token: () => reader,
  };
  return { api: createRemoteApi(client), asked, carried, setAside };
};

/** The cause a read failed with, or `null` when it answered or failed with no cause of the contract's. */
const failedWith = async (read: Promise<unknown>): Promise<ContentErrorCode | null> =>
  read.then(
    () => null,
    (error: unknown) => (error instanceof ContentApiError ? error.code : null),
  );

test('the sections are the menu’s, in its order, the slug for an id', async () => {
  const { api } = replaying();
  const sections = await api.getSections();
  expect(sections.map((section) => section.id).slice(0, 3)).toEqual(['politique', 'social-eco', 'societe']);
  expect(sections).toHaveLength(11);
});

test('the front is one answer, in the order the desk laid it out', async () => {
  const { api } = replaying();
  const front = await api.getFeed({});
  expect(front.items.map((item) => item.id)).toEqual(RECORDED.front.answer.posts.map((post) => post.id));
  expect(front.nextCursor).toBeNull();
});

/** A section's list is asked under the number the menu files it under, which the domain never carries. */
test('a section is asked by the number the menu gives it, and serves its own list', async () => {
  const { api, asked } = replaying();
  const own = await api.getFeed({ section: SECTION_ID.parse('politique') });
  expect(asked.at(-1)).toBe(`${SERVICE}${SERVICE_ROOT}/wordpress/19565/posts/?page=1&language=fr&ano=1`);
  expect(own.items.map((item) => item.id)).toEqual(RECORDED.section.answer.posts.map((post) => post.id));
});

/** A full page has another after it — thirty sent, whatever the reading kept — and a short page is the last. */
test('a full page of a section opens the next, and a short one ends the list', async () => {
  const [first] = RECORDED.section.answer.posts;
  const full = Array.from({ length: 30 }, (...[, at]) => ({ ...first, id: String(3_900_000 + at) }));
  const { api, asked } = replaying((route, query): Promise<Reply> | undefined =>
    route === 'section' ? json(200, { posts: query.includes('page=1') ? full : [first] }) : undefined,
  );
  const section = SECTION_ID.parse('monde');
  const one = await api.getFeed({ section });
  expect(one.nextCursor).toBe('2');
  const two = await api.getFeed({ section, cursor: one.nextCursor ?? '' });
  expect(asked.at(-1)).toContain('/posts/?page=2&');
  expect(two.nextCursor).toBeNull();
});

/** The recorded menu as the service would answer it once the newsroom dropped the section `slug`. */
const withoutSection = (slug: string): unknown => ({
  [SECTIONS_KEY]: RECORDED.menu.answer[SECTIONS_KEY].filter((each) => each.slug !== slug),
});

/** How many times the menu was asked for, of every address a client asked. */
const menuAsks = (asked: readonly string[]): number =>
  asked.filter((address) => address.includes('/wordpress/menu')).length;

test('the pages of a section go by the menu as last read, and never ask for it again', async () => {
  const { api, asked } = replaying();
  await api.getFeed({ section: SECTION_ID.parse('politique') });
  await api.getFeed({ section: SECTION_ID.parse('monde') });
  expect(menuAsks(asked)).toBe(1);
});

/**
 * The app reads its sections again once they are stale, and that reading has to reach the service: a menu kept for
 * as long as the app ran answered every re-reading with the first, and a section the newsroom added or removed never
 * showed until the app was started again.
 */
test('the sections are read anew each time, and the lists they open go by the last reading', async () => {
  let answered = 0;
  const { api, asked } = replaying((route): Promise<Reply> | undefined => {
    if (route !== 'menu') {
      return undefined;
    }
    answered += 1;
    return json(200, answered === 1 ? RECORDED.menu.answer : withoutSection('monde'));
  });
  expect((await api.getSections()).map((each) => each.id)).toContain('monde');
  expect((await api.getSections()).map((each) => each.id)).not.toContain('monde');
  expect(menuAsks(asked)).toBe(2);
  expect(await failedWith(api.getFeed({ section: SECTION_ID.parse('monde') }))).toBe('not-found');
  expect(menuAsks(asked)).toBe(2);
});

test('a menu that failed is not kept: the next question asks for it again', async () => {
  let answered = 0;
  const { api, asked } = replaying((route): Promise<Reply> | undefined => {
    if (route !== 'menu') {
      return undefined;
    }
    answered += 1;
    return answered === 1 ? json(503, {}) : json(200, RECORDED.menu.answer);
  });
  expect(await failedWith(api.getSections())).toBe('unavailable');
  expect(await api.getSections()).toHaveLength(11);
  expect(menuAsks(asked)).toBe(2);
});

test('a section the menu does not list, and an article of the corpus, are not found — and never asked', async () => {
  const { api, asked } = replaying();
  expect(await failedWith(api.getFeed({ section: SECTION_ID.parse('sport') }))).toBe('not-found');
  const before = asked.length;
  expect(await failedWith(api.getArticle(ARTICLE_ID.parse('pol-a1')))).toBe('not-found');
  expect(asked.length).toBe(before);
});

test('an article is read whole by the number it was filed under', async () => {
  const { api } = replaying();
  const [id = ''] = RECORDED.articles.opinion.path.split('/').slice(-1);
  const article = await api.getArticle(ARTICLE_ID.parse(id));
  expect(article.id).toBe(id);
  expect(article.body.kind).toBe('open');
});

test('a search asks its question in the path, ten at a time', async () => {
  const { api, asked } = replaying();
  const found = await api.search({ text: QUESTION.parse('  école  ') });
  expect(asked.at(-1)).toBe(`${SERVICE}${SERVICE_ROOT}/article/search/%C3%A9cole?page=1&per_page=10&language=fr&ano=1`);
  expect(found.items.length).toBeGreaterThan(0);
});

/** An odd item costs the list itself, and it is told to the door rather than dropped in silence. */
test('what a reading sets aside is told, by the route it came from', async () => {
  const [first, ...rest] = RECORDED.wire.answer.posts;
  const { api, setAside } = replaying((route): Promise<Reply> | undefined =>
    route === 'wire' ? json(200, { posts: [{ ...first, date: 'hier soir' }, ...rest] }) : undefined,
  );
  const wire = await api.getLiveFeed({});
  expect(wire.items).toHaveLength(rest.length);
  expect(setAside.map(([route, items]) => [route, items.map((item) => item.at)])).toEqual([['wire', [0]]]);
});

test('an answer that holds no list is refused as unreadable', async () => {
  const { api } = replaying((route): Promise<Reply> | undefined =>
    route === 'wire' ? json(200, { error: true }) : undefined,
  );
  expect(await failedWith(api.getLiveFeed({}))).toBe('malformed');
});

/**
 * The two halves of reading as a subscriber: the token their login earned goes out with every request, and `ano` —
 * the flag that says nobody signed in — comes off it. The service grants the right; the client only asks as itself.
 */
test('a reader who signed in is asked for as themselves, on every route', async () => {
  const { api, asked, carried } = replaying(undefined, 'jeton-de-labonne');
  await api.getFeed({});
  await api.getSections();
  await api.search({ text: QUESTION.parse('école') });
  expect(asked.filter((address) => address.includes('ano='))).toEqual([]);
  expect(carried.map((headers) => headers['x-user-token'])).toEqual(asked.map(() => 'jeton-de-labonne'));
  expect(asked[0]).toBe(`${SERVICE}${SERVICE_ROOT}/wordpress/home?language=fr`);
});

test('nobody signed in carries no token at all, and says so with ano', async () => {
  const { api, asked, carried } = replaying();
  await api.getFeed({});
  expect(carried.map((headers) => headers['x-user-token'])).toEqual([undefined]);
  expect(asked[0]).toBe(`${SERVICE}${SERVICE_ROOT}/wordpress/home?language=fr&ano=1`);
});
