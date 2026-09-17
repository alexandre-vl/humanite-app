import { expect, expectTypeOf, test } from 'vitest';
import { ACCESS, ARTICLE_FORMAT, ARTICLE_KIND } from './index.ts';
import type { Access, ArticleFormat, ArticleKind } from './index.ts';

test('ARTICLE_KIND parses its members and rejects others', () => {
  expectTypeOf(ARTICLE_KIND.parse('article')).toEqualTypeOf<ArticleKind>();
  expect(ARTICLE_KIND.safeParse('story').success).toBe(false);
});

test('ARTICLE_FORMAT parses its members', () => {
  expectTypeOf(ARTICLE_FORMAT.parse('video')).toEqualTypeOf<ArticleFormat>();
  expect(ARTICLE_FORMAT.safeParse('audio').success).toBe(false);
});

test('ACCESS parses its members', () => {
  expectTypeOf(ACCESS.parse('premium')).toEqualTypeOf<Access>();
  expect(ACCESS.safeParse('paid').success).toBe(false);
});
