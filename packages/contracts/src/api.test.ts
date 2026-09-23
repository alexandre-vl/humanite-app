import { expect, expectTypeOf, test } from 'vitest';
import { CONTENT_ERROR_CODES, ContentApiError } from './index.ts';
import type {
  ArticleId,
  ArticleSummary,
  ContentApi,
  ContentErrorCode,
  FeedQuery,
  Page,
  PageQuery,
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

/** The source decides how much a page holds: a size only one source could honour is not something a caller asks. */
test('a query asks for a page by its cursor, and never for a size', () => {
  expectTypeOf<PageQuery>().not.toHaveProperty('limit');
  expectTypeOf<FeedQuery>().not.toHaveProperty('limit');
  expectTypeOf<SearchQuery>().not.toHaveProperty('limit');
  expectTypeOf<FeedQuery>().toExtend<PageQuery>();
  expectTypeOf<SearchQuery>().toExtend<PageQuery>();
});

test('a page tells where the next one starts, and counts nothing', () => {
  expectTypeOf<Page<ArticleSummary>>().not.toHaveProperty('total');
  expectTypeOf<Page<ArticleSummary>['nextCursor']>().toEqualTypeOf<string | null>();
});

test('the content api returns pages and takes branded ids', () => {
  expectTypeOf<ContentApi['getFeed']>().returns.toEqualTypeOf<Promise<Page<ArticleSummary>>>();
  expectTypeOf<ContentApi['getArticle']>().parameter(0).toEqualTypeOf<ArticleId>();
});
