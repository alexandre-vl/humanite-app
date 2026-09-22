import { expect, expectTypeOf, test } from 'vitest';
import { RECORDED } from './recorded.ts';
import { REMOTE_ARTICLE, REMOTE_FEED, REMOTE_SEARCH, REMOTE_SECTIONS } from './remote.ts';
import type { RemoteArticle, RemoteFeed, RemoteSections } from './remote.ts';

/**
 * These hold the wire shapes against what the service actually answered, not against what we remember of it. A schema
 * written from a reading of a capture and never replayed on it is a guess; replayed, it is a measurement.
 */

const FEEDS = [
  { label: 'the front', body: RECORDED.front },
  { label: 'the wire', body: RECORDED.wire },
  { label: 'a section', body: RECORDED.sectionFeed },
] as const;

test.each(FEEDS)('REMOTE_FEED reads what the service answered for $label', ({ body }) => {
  const feed: RemoteFeed = REMOTE_FEED.parse(body);
  expectTypeOf(feed).toEqualTypeOf<RemoteFeed>();
  expect(feed.posts.length).toBeGreaterThan(0);
  for (const post of feed.posts) {
    expect(post.id).toMatch(/^\d+$/u);
    expect(post.type).toBe('post');
  }
});

test('REMOTE_FEED reads an id as a string, whether the service wrote a number or not', () => {
  const [first] = RECORDED.sectionFeed.posts;
  const asNumber = REMOTE_FEED.parse({ posts: [{ ...first, id: 3_861_029 }] });
  const asString = REMOTE_FEED.parse({ posts: [{ ...first, id: '3861029' }] });
  expect(asNumber.posts[0]?.id).toBe('3861029');
  expect(asString.posts[0]?.id).toBe('3861029');
});

test('REMOTE_SEARCH reads a search and the flag it comes behind', () => {
  const found = REMOTE_SEARCH.parse(RECORDED.search);
  expect(found.success).toBe(true);
  expect(found.posts.length).toBeGreaterThan(0);
});

test('REMOTE_SECTIONS renames the service key and answers the journal eleven sections', () => {
  const sections: RemoteSections = REMOTE_SECTIONS.parse(RECORDED.sections);
  expectTypeOf(sections).toEqualTypeOf<RemoteSections>();
  expect(sections.sections).toHaveLength(11);
  expect(sections.sections.map((section) => section.slug)).toContain('politique');
});

/** Every article the capture holds, by the format the journal gave it: a new format is read without a line here. */
const ARTICLES = Object.entries(RECORDED.articles).map(([format, body]) => ({ format, body }));

test.each(ARTICLES)('REMOTE_ARTICLE reads a body the service filed as $format', ({ body }) => {
  const article: RemoteArticle = REMOTE_ARTICLE.parse(body);
  expectTypeOf(article).toEqualTypeOf<RemoteArticle>();
  expect(article.content_array).toHaveLength(1);
  expect(article.content_array[0] ?? '').toContain('form_don');
});

test('REMOTE_ARTICLE refuses an answer with no body, which a feed item nonetheless is', () => {
  expect(REMOTE_ARTICLE.safeParse(RECORDED.sectionFeed.posts[0]).success).toBe(false);
});

test('REMOTE_POST refuses an item the service would have dropped a required field from', () => {
  const [first] = RECORDED.sectionFeed.posts;
  const without = Object.fromEntries(Object.entries(first).filter(([field]) => field !== 'premium'));
  expect(REMOTE_FEED.safeParse({ posts: [without] }).success).toBe(false);
});

test('a format outside the four the service names stops the reading', () => {
  const [first] = RECORDED.sectionFeed.posts;
  expect(REMOTE_FEED.safeParse({ posts: [{ ...first, article_format: 'podcast' }] }).success).toBe(false);
});
