import { ARTICLE_ID, ContentApiError, SECTION_ID } from '@huma/contracts';
import type { ContentErrorCode, SetAside } from '@huma/contracts';
import { expect, test } from 'vitest';
import { createRemoteApi } from './api.ts';
import type { Client } from './api.ts';
import { RECORDED } from './recorded.ts';
import { routeOf, SERVICE, SERVICE_ROOT } from './routes.ts';
import type { RouteName } from './routes.ts';
import type { Reply } from './transport.ts';

/** What the service answered, by route, as the capture kept it. */
const ANSWERS: Readonly<Record<Exclude<RouteName, 'article'>, unknown>> = {
  front: RECORDED.front.answer,
  wire: RECORDED.wire.answer,
  menu: RECORDED.menu.answer,
  section: RECORDED.section.answer,
  search: RECORDED.search.answer,
};

const reply = async (status: number, body: unknown): Promise<Reply> =>
  Promise.resolve({ status, text: async () => Promise.resolve(JSON.stringify(body)) });

/** The path under the service's root an address asks for, and its query. */
const partsOf = (address: string): readonly [string, string] => {
  const [path = '', query = ''] = address.slice(`${SERVICE}${SERVICE_ROOT}`.length).split('?');
  return [path, query];
};

/**
 * A client over a replay of the capture: each route answered with what it answered then, an article by the one of its
 * number the capture kept, and anything else with a 404. `answer` may take a route over, and every address asked and
 * every item set aside is kept for the test to read.
 */
const replaying = (answer?: (route: RouteName, query: string) => Promise<Reply> | undefined) => {
  const asked: string[] = [];
  const setAside: (readonly [RouteName, readonly SetAside[]])[] = [];
  const client: Client<number> = {
    fetch: async (address) => {
      asked.push(address);
      const [path, query] = partsOf(address);
      const route = routeOf(path);
      const taken = route === undefined ? undefined : answer?.(route, query);
      if (taken !== undefined) {
        return taken;
      }
      if (route === 'article') {
        const kept = Object.values(RECORDED.articles).find((each) => each.path === path);
        return kept === undefined ? reply(404, {}) : reply(200, kept.answer);
      }
      return route === undefined ? reply(404, {}) : reply(200, ANSWERS[route]);
    },
    abortable: () => ({ signal: 0, abort: () => undefined }),
    after: () => () => undefined,
    setAside: (route, items) => {
      setAside.push([route, items]);
    },
  };
  return { api: createRemoteApi(client), asked, setAside };
};

const causeOf = async (read: Promise<unknown>): Promise<ContentErrorCode | null> =>
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
test('a section is asked by the number the menu gives it, and its items are placed in it', async () => {
  const { api, asked } = replaying();
  const own = await api.getFeed({ section: SECTION_ID.parse('politique') });
  expect(asked.at(-1)).toBe(`${SERVICE}${SERVICE_ROOT}/wordpress/19565/posts/?page=1&language=fr&ano=1`);
  expect(own.items.every((item) => item.section === 'politique')).toBe(true);
});

/** A full page has another after it — thirty sent, whatever the reading kept — and a short page is the last. */
test('a full page of a section opens the next, and a short one ends the list', async () => {
  const [first] = RECORDED.section.answer.posts;
  const full = Array.from({ length: 30 }, (...[, at]) => ({ ...first, id: String(3_900_000 + at) }));
  const { api, asked } = replaying((route, query): Promise<Reply> | undefined =>
    route === 'section' ? reply(200, { posts: query.includes('page=1') ? full : [first] }) : undefined,
  );
  const section = SECTION_ID.parse('monde');
  const one = await api.getFeed({ section });
  expect(one.nextCursor).toBe('2');
  const two = await api.getFeed({ section, cursor: one.nextCursor ?? '' });
  expect(asked.at(-1)).toContain('/posts/?page=2&');
  expect(two.nextCursor).toBeNull();
});

test('the menu is asked once, however many sections are read after it', async () => {
  const { api, asked } = replaying();
  await api.getFeed({ section: SECTION_ID.parse('politique') });
  await api.getFeed({ section: SECTION_ID.parse('monde') });
  await api.getSections();
  expect(asked.filter((address) => address.includes('/wordpress/menu')).length).toBe(1);
});

test('a menu that failed is not kept: the next question asks for it again', async () => {
  let answered = 0;
  const { api, asked } = replaying((route): Promise<Reply> | undefined => {
    if (route !== 'menu') {
      return undefined;
    }
    answered += 1;
    return answered === 1 ? reply(503, {}) : reply(200, RECORDED.menu.answer);
  });
  expect(await causeOf(api.getSections())).toBe('unavailable');
  expect(await api.getSections()).toHaveLength(11);
  expect(asked.filter((address) => address.includes('/wordpress/menu')).length).toBe(2);
});

test('a section the menu does not list, and an article of the corpus, are not found — and never asked', async () => {
  const { api, asked } = replaying();
  expect(await causeOf(api.getFeed({ section: SECTION_ID.parse('sport') }))).toBe('not-found');
  const before = asked.length;
  expect(await causeOf(api.getArticle(ARTICLE_ID.parse('pol-a1')))).toBe('not-found');
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
  const found = await api.search({ text: '  école  ' });
  expect(asked.at(-1)).toBe(`${SERVICE}${SERVICE_ROOT}/article/search/%C3%A9cole?page=1&per_page=10&language=fr&ano=1`);
  expect(found.items.length).toBeGreaterThan(0);
});

/** An odd item costs the list itself, and it is told to the door rather than dropped in silence. */
test('what a reading sets aside is told, by the route it came from', async () => {
  const [first, ...rest] = RECORDED.wire.answer.posts;
  const { api, setAside } = replaying((route): Promise<Reply> | undefined =>
    route === 'wire' ? reply(200, { posts: [{ ...first, date: 'hier soir' }, ...rest] }) : undefined,
  );
  const wire = await api.getLiveFeed({});
  expect(wire.items).toHaveLength(rest.length);
  expect(setAside.map(([route, items]) => [route, items.map((item) => item.at)])).toEqual([['wire', [0]]]);
});

test('an answer that holds no list is refused as unreadable', async () => {
  const { api } = replaying((route): Promise<Reply> | undefined =>
    route === 'wire' ? reply(200, { error: true }) : undefined,
  );
  expect(await causeOf(api.getLiveFeed({}))).toBe('malformed');
});
