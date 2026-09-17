import { ARTICLE_ID, ContentApiError, SECTION_ID } from '@huma/contracts';
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

test('an injected failure rejects with its code', async () => {
  const flaky = createContentApi({ fail: { getFeed: 'unavailable' } });
  await expect(flaky.getFeed({})).rejects.toMatchObject({ code: 'unavailable' });
});
