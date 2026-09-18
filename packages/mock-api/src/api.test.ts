import { ARTICLE_ID, ContentApiError, SECTION_ID } from '@huma/contracts';
import type { ContentApi, ContentErrorCode } from '@huma/contracts';
import { expect, test } from 'vitest';
import { contentApi, createContentApi } from './index.ts';
import type { MockApiOptions } from './index.ts';

test('getSections and getAuthors expose the registries', async () => {
  await expect(contentApi.getSections()).resolves.toHaveLength(8);
  await expect(contentApi.getAuthors()).resolves.toHaveLength(19);
});

test('getFeed filters by section, newest first, and paginates', async () => {
  const section = SECTION_ID.parse('politique');
  const first = await contentApi.getFeed({ section, limit: 4 });
  expect(first.total).toBe(9);
  expect(first.items).toHaveLength(4);
  expect(first.items.every((item) => item.section === section)).toBe(true);
  expect(first.nextCursor).not.toBeNull();
  const dates = first.items.map((item) => item.publishedAt);
  expect(dates).toEqual([...dates].toSorted((left, right) => right.localeCompare(left)));
});

test('getFeed without a section spans the whole corpus', async () => {
  const all = await contentApi.getFeed({});
  expect(all.total).toBe(72);
});

test('getLiveFeed pages through every item newest first', async () => {
  const live = await contentApi.getLiveFeed({ limit: 100 });
  expect(live.items).toHaveLength(72);
  expect(live.nextCursor).toBeNull();
});

test('getArticle returns the body and rejects an unknown id', async () => {
  const article = await contentApi.getArticle(ARTICLE_ID.parse('pol-a1'));
  expect(article.blocks.length).toBeGreaterThan(0);
  await expect(contentApi.getArticle(ARTICLE_ID.parse('zzz-a1'))).rejects.toBeInstanceOf(ContentApiError);
});

test('search matches titles, standfirsts and tags', async () => {
  const results = await contentApi.search({ text: 'budget' });
  expect(results.items.length).toBeGreaterThan(0);
});

test('getSession reports the mock session, subscriber when asked', async () => {
  await expect(contentApi.getSession()).resolves.toEqual({ isSubscriber: false });
  const options: MockApiOptions = { session: { isSubscriber: true } };
  const premium = createContentApi(options);
  await expect(premium.getSession()).resolves.toEqual({ isSubscriber: true });
});

test('getSummaries answers in the order asked and rejects an unknown id', async () => {
  const ids = [ARTICLE_ID.parse('mon-a2'), ARTICLE_ID.parse('pol-a1')];
  const summaries = await contentApi.getSummaries(ids);
  expect(summaries.map((summary) => summary.id)).toEqual(ids);
  await expect(contentApi.getSummaries([ARTICLE_ID.parse('zzz-a1')])).rejects.toBeInstanceOf(ContentApiError);
});

/** One call per method of the contract: a method added without its call here is a type error, not a silent gap. */
const CALLS = {
  getSections: async (api) => api.getSections(),
  getAuthors: async (api) => api.getAuthors(),
  getFeed: async (api) => api.getFeed({}),
  getLiveFeed: async (api) => api.getLiveFeed({}),
  getArticle: async (api) => api.getArticle(ARTICLE_ID.parse('pol-a1')),
  getSummaries: async (api) => api.getSummaries([ARTICLE_ID.parse('pol-a1')]),
  search: async (api) => api.search({ text: 'budget' }),
  getSession: async (api) => api.getSession(),
} satisfies Readonly<Record<keyof ContentApi, (api: ContentApi) => Promise<unknown>>>;

const METHODS = Object.keys(CALLS).filter((name): name is keyof ContentApi => Object.hasOwn(CALLS, name));

test('every method of the contract reports the failure injected on its name', async () => {
  expect(METHODS).toHaveLength(8);
  for (const method of METHODS) {
    const fail: Partial<Record<keyof ContentApi, ContentErrorCode>> = {};
    fail[method] = 'unavailable';
    await expect(CALLS[method](createContentApi({ fail }))).rejects.toMatchObject({ code: 'unavailable' });
  }
});
