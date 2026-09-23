import { expect, expectTypeOf, test } from 'vitest';
import { ARTICLE, ARTICLE_SUMMARY, blocksOf, HERO } from './article.ts';
import type { Article, ArticleSummary, Hero } from './article.ts';

const validSummary = {
  id: 'pol-a1',
  section: 'politique',
  format: 'article',
  access: 'premium',
  title: 'Un titre de longueur raisonnable pour un article de la maquette',
  standfirst:
    'Un chapô assez long pour tenir dans la fourchette imposée par le schéma, décrivant en une phrase claire ce que raconte cet article fictif de démonstration destiné à la maquette.',
  byline: 'Lucie Varenne',
  publishedAt: '2026-09-10T08:30:00.000Z',
  hero: {
    picture: { kind: 'corpus', key: 'pol-a1-hero' },
    caption: 'Une légende',
    credit: 'Photo : Camille Ancel / CC BY 4.0',
  },
};

test('ARTICLE_SUMMARY parses a valid summary', () => {
  const summary: ArticleSummary = ARTICLE_SUMMARY.parse(validSummary);
  expectTypeOf(summary).toEqualTypeOf<ArticleSummary>();
});

/** The field set itself, pinned: a field added to the schema is an edit here as well, so none arrives unnoticed. */
test('a summary carries these fields and no others', () => {
  expect([...Object.keys(ARTICLE_SUMMARY.shape)].sort((left, right) => left.localeCompare(right))).toEqual([
    'access',
    'byline',
    'format',
    'hero',
    'id',
    'publishedAt',
    'standfirst',
    'title',
  ]);
});

test('ARTICLE_SUMMARY takes what the journal actually files, which no bound would have let through', () => {
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, title: 'Climat' }).success).toBe(true);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, title: 'T'.repeat(226) }).success).toBe(true);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, standfirst: '' }).success).toBe(true);
  // A whole route of the service signs nothing: fifty-five items of one capture came with no name at all.
  const unsigned = Object.fromEntries(Object.entries(validSummary).filter(([field]) => field !== 'byline'));
  expect(ARTICLE_SUMMARY.safeParse(unsigned).success).toBe(true);
});

test('ARTICLE_SUMMARY reads an id of the journal as it reads one of the corpus, and nothing between', () => {
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, id: '3861029' }).success).toBe(true);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, id: 'pol-z9' }).success).toBe(false);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, id: '3861029-x' }).success).toBe(false);
  expect(ARTICLE_SUMMARY.safeParse({ ...validSummary, id: 'pol-a1-hero' }).success).toBe(false);
});

test('ARTICLE extends the summary with a body, which a video of the journal leaves empty', () => {
  const article: Article = ARTICLE.parse({
    ...validSummary,
    body: { kind: 'open', blocks: [{ type: 'paragraph', spans: [{ type: 'text', text: 'x' }] }] },
  });
  expectTypeOf(article).toEqualTypeOf<Article>();
  expect(blocksOf(article)).toHaveLength(1);
  expect(ARTICLE.safeParse({ ...validSummary, format: 'video', body: { kind: 'open', blocks: [] } }).success).toBe(
    true,
  );
  expect(ARTICLE.safeParse({ ...validSummary }).success).toBe(false);
});

/** A body kept back is nothing at all, and a withheld body that carried blocks would be a body unlocked. */
test('a withheld body carries no blocks, and gives none', () => {
  const withheld = ARTICLE.parse({ ...validSummary, body: { kind: 'withheld' } });
  expect(blocksOf(withheld)).toEqual([]);
  const smuggled = ARTICLE.parse({
    ...validSummary,
    body: { kind: 'withheld', blocks: [{ type: 'heading', text: 'x' }] },
  });
  expect(smuggled.body).toEqual({ kind: 'withheld' });
});

test('ARTICLE_SUMMARY takes an item whose section nobody named', () => {
  const unplaced = Object.fromEntries(Object.entries(validSummary).filter(([field]) => field !== 'section'));
  expect(ARTICLE_SUMMARY.safeParse(unplaced).success).toBe(true);
});

test('HERO names its picture, and the words under it when there are any', () => {
  const hero: Hero = HERO.parse({ picture: { kind: 'corpus', key: 'pol-a1-hero' }, caption: 'c', credit: 'Photo : X' });
  expectTypeOf(hero).toEqualTypeOf<Hero>();
  expect(HERO.safeParse({ caption: 'c', credit: 'Photo : X' }).success).toBe(false);
  expect(HERO.safeParse({ picture: { kind: 'corpus', key: 'pol-a1' } }).success).toBe(false);
});

/**
 * The blocker this shape removed: a picture could only be a key of the corpus, which is built on the corpus's own id
 * grammar, so no item of the journal could ever carry one — and nothing failed to say so, every real item simply came
 * through bare. Its picture is an address, and the journal sets no credit under it and often no caption either.
 */
test('HERO takes a picture of the journal, with nothing written under it', () => {
  const url = 'https://www.humanite.fr/wp-content/uploads/2026/09/x.jpg?w=1200';
  expect(HERO.safeParse({ picture: { kind: 'journal', url } }).success).toBe(true);
  expect(
    ARTICLE_SUMMARY.safeParse({ ...validSummary, id: '3861029', hero: { picture: { kind: 'journal', url } } }).success,
  ).toBe(true);
});
