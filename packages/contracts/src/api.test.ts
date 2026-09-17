import { expect, expectTypeOf, test } from 'vitest';
import { CONTENT_ERROR_CODES, ContentApiError } from './index.ts';
import type {
  ArticleId,
  ArticleSummary,
  ContentApi,
  ContentErrorCode,
  FeedQuery,
  LiveQuery,
  Page,
  SearchQuery,
} from './index.ts';

test('ContentApiError is an Error carrying a code', () => {
  const error = new ContentApiError('not-found', 'introuvable');
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe('not-found');
  expectTypeOf(error.code).toEqualTypeOf<ContentErrorCode>();
});

test('CONTENT_ERROR_CODES lists the error codes', () => {
  expect(CONTENT_ERROR_CODES).toContain('timeout');
  expectTypeOf<(typeof CONTENT_ERROR_CODES)[number]>().toEqualTypeOf<ContentErrorCode>();
});

test('the query types describe what a caller may select', () => {
  const feed: FeedQuery = { limit: 10 };
  const live: LiveQuery = { limit: 10 };
  const search: SearchQuery = { text: 'greve' };
  expect(feed.limit).toBe(10);
  expect(live.limit).toBe(10);
  expect(search.text).toBe('greve');
});

test('the content api returns pages and takes branded ids', () => {
  expectTypeOf<ContentApi['getFeed']>().returns.toEqualTypeOf<Promise<Page<ArticleSummary>>>();
  expectTypeOf<ContentApi['getArticle']>().parameter(0).toEqualTypeOf<ArticleId>();
});
