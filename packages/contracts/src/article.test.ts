import { expect, expectTypeOf, test } from 'vitest';
import { ARTICLE, ARTICLE_SUMMARY, HERO } from './index.ts';
import type { Article, ArticleSummary, Hero } from './index.ts';

const validSummary = {
  id: 'pol-a1',
  kind: 'article',
  section: 'politique',
  format: 'article',
  access: 'premium',
  title: 'Un titre de longueur raisonnable pour un article de la maquette',
  standfirst:
    'Un chapô assez long pour tenir dans la fourchette imposée par le schéma, décrivant en une phrase claire ce que raconte cet article fictif de démonstration destiné à la maquette.',
  authors: ['lucie-varenne'],
  publishedAt: '2026-09-10T08:30:00.000Z',
  tags: ['budget', 'education'],
  hero: { key: 'pol-a1-hero', caption: 'Une légende', credit: 'Photo : Camille Ancel / CC BY 4.0' },
};

test('ARTICLE_SUMMARY parses a valid summary', () => {
  const summary: ArticleSummary = ARTICLE_SUMMARY.parse(validSummary);
  expectTypeOf(summary).toEqualTypeOf<ArticleSummary>();
});

test('ARTICLE_SUMMARY rejects a short title and an over-long standfirst', () => {
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, title: 'Court' }).success).toBe(false);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, standfirst: 'B'.repeat(400) }).success).toBe(false);
});

test('ARTICLE_SUMMARY rejects zero or three authors', () => {
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, authors: [] }).success).toBe(false);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, authors: ['a-b', 'c-d', 'e-f'] }).success).toBe(false);
});

test('ARTICLE extends the summary with a non-empty body', () => {
  const article: Article = ARTICLE.parse({
    ...validSummary,
    blocks: [{ type: 'paragraph', spans: [{ type: 'text', value: 'x' }] }],
  });
  expectTypeOf(article).toEqualTypeOf<Article>();
  expect(ARTICLE.safeParse({ ...validSummary, blocks: [] }).success).toBe(false);
});

test('HERO names its picture, its caption and its credit', () => {
  const hero: Hero = HERO.parse({ key: 'pol-a1-hero', caption: 'c', credit: 'Photo : X' });
  expectTypeOf(hero).toEqualTypeOf<Hero>();
  expect(HERO.safeParse({ caption: 'c', credit: 'Photo : X' }).success).toBe(false);
  expect(HERO.safeParse({ key: 'pol-a1', caption: 'c', credit: 'Photo : X' }).success).toBe(false);
});
