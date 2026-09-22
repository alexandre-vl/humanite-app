import { expect, expectTypeOf, test } from 'vitest';
import { ACCESS, ARTICLE_FORMAT } from './index.ts';
import type { Access, ArticleFormat } from './index.ts';

test('ARTICLE_FORMAT parses its members and rejects others', () => {
  expectTypeOf(ARTICLE_FORMAT.parse('video')).toEqualTypeOf<ArticleFormat>();
  expect(ARTICLE_FORMAT.safeParse('audio').success).toBe(false);
});

test('ACCESS parses its members', () => {
  expectTypeOf(ACCESS.parse('premium')).toEqualTypeOf<Access>();
  expect(ACCESS.safeParse('paid').success).toBe(false);
});
