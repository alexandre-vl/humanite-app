import { ARTICLE_ID, blocksOf, ContentApiError, issueIdAt, SECTION_ID } from '@huma/contracts';
import { CORPUS } from '@huma/mock-content';
import { expect, test } from 'vitest';
import { contentApi } from './index.ts';

/** Newest first, as a list of instants reads when nothing has been moved out of its place. */
const newestFirst = (instants: readonly string[]): boolean =>
  instants.every((instant, at) => at === 0 || (instants[at - 1] ?? '').localeCompare(instant) >= 0);

test('getSections answers the registry, in the order of the bar', async () => {
  const sections = await contentApi.getSections();
  expect(sections.map((section) => section.id)).toEqual([
    'politique',
    'social-eco',
    'societe',
    'monde',
    'culture-et-savoir',
    'feminisme',
    'environnement',
    'sport',
  ]);
});

/**
 * The front of the journal's service is one answer of thirteen, in its desk's order. The corpus has no desk, so it
 * lays its own: its thirteen newest, opened on the first of them with a picture, the rest as they came.
 */
test('getFeed without a section is the front: the thirteen newest, opened on a picture, in one answer', async () => {
  const front = await contentApi.getFeed({});
  expect(front.items).toHaveLength(13);
  expect(front.nextCursor).toBeNull();
  const [opener, ...rest] = front.items;
  expect(opener?.hero).toBeDefined();
  expect(newestFirst(rest.map((item) => item.publishedAt))).toBe(true);
});

test('getFeed with a section is that section’s own list, newest first', async () => {
  const section = SECTION_ID.parse('politique');
  const own = await contentApi.getFeed({ section });
  expect(own.items).toHaveLength(9);
  const written = new Set(CORPUS.filter((entry) => entry.section === section).map((entry) => entry.id));
  expect(own.items.every((item) => written.has(item.id))).toBe(true);
  expect(own.items.some((item) => 'section' in item)).toBe(false);
  expect(newestFirst(own.items.map((item) => item.publishedAt))).toBe(true);
  expect(own.nextCursor).toBeNull();
});

/** The wire of the journal's service is one answer of ten, never seen paged. */
test('getLiveFeed is the ten newest, in one answer', async () => {
  const wire = await contentApi.getLiveFeed({});
  expect(wire.items).toHaveLength(10);
  expect(wire.nextCursor).toBeNull();
  expect(newestFirst(wire.items.map((item) => item.publishedAt))).toBe(true);
});

test('getArticle serves a free article whole, and rejects an unknown id', async () => {
  const article = await contentApi.getArticle(ARTICLE_ID.parse('pol-a5'));
  expect(article.access).toBe('free');
  expect(blocksOf(article).length).toBeGreaterThan(0);
  await expect(contentApi.getArticle(ARTICLE_ID.parse('zzz-a1'))).rejects.toBeInstanceOf(ContentApiError);
});

/** The reader the app is has no subscription: a reserved article comes with its head, and its body kept back. */
test('getArticle withholds the body of a reserved article, and nothing else of it', async () => {
  const reserved = CORPUS.filter((article) => article.access === 'premium');
  expect(reserved.length).toBeGreaterThan(0);
  for (const article of reserved) {
    const served = await contentApi.getArticle(article.id);
    expect(served.body).toEqual({ kind: 'withheld' });
    expect(served.title).toBe(article.title);
  }
});

test('search matches titles and standfirsts, and nothing of the body', async () => {
  const byTitle = await contentApi.search({ text: 'conseil municipal' });
  expect(byTitle.items.map((item) => item.id)).toContain('pol-a5');
  const byStandfirst = await contentApi.search({ text: 'cantines' });
  expect(byStandfirst.items.map((item) => item.id)).toContain('pol-a5');
  // A word the body of pol-a5 holds and neither of its two searchable fields does: a summary carries no body at all.
  const body = await contentApi.getArticle(ARTICLE_ID.parse('pol-a5'));
  expect(JSON.stringify(blocksOf(body))).toContain('délibération');
  await expect(contentApi.search({ text: 'délibération' })).resolves.toMatchObject({ items: [] });
});

test('search reads French as it is typed, not as it is written', async () => {
  const written = await contentApi.search({ text: 'école' });
  const typed = await contentApi.search({ text: 'ecole' });
  expect(written.items.length).toBeGreaterThan(0);
  expect(typed.items).toEqual(written.items);
  // `œ` is one letter, which NFD leaves whole: only spelling it out makes `coeur` find the standfirst of pol-a5.
  const ligature = await contentApi.search({ text: 'coeur' });
  expect(ligature.items.map((item) => item.id)).toEqual(['pol-a5']);
  const shouted = await contentApi.search({ text: '  ÉCOLE  ' });
  expect(shouted.items).toEqual(written.items);
});

/** The journal's search answers ten at a time; the mock's pages the same way, each page opening where the last ended. */
test('search pages by ten, newest first, and its pages share nothing', async () => {
  const first = await contentApi.search({ text: 'e' });
  expect(first.items).toHaveLength(10);
  expect(first.nextCursor).not.toBeNull();
  const second = await contentApi.search({ text: 'e', cursor: first.nextCursor ?? '' });
  expect(second.items).toHaveLength(10);
  const ids = new Set(first.items.map((item) => item.id));
  expect(second.items.filter((item) => ids.has(item.id))).toEqual([]);
  expect(newestFirst([...first.items, ...second.items].map((item) => item.publishedAt))).toBe(true);
});

test('getIssues gathers the corpus into one numéro a day, the most recent first', async () => {
  const shelf = await contentApi.getIssues();
  expect(shelf.map((issue) => issue.id)).toEqual(['2026-09-13', '2026-09-12', '2026-09-11', '2026-09-10']);
  expect(shelf.map((issue) => issue.count)).toEqual([11, 21, 22, 18]);
});

/** A numéro is a day and nothing else, so the numéros are a partition of the paper: every item counted exactly once. */
test('the numéros count between them every item the paper printed, each once', async () => {
  const shelf = await contentApi.getIssues();
  expect(shelf.reduce((sum, issue) => sum + issue.count, 0)).toBe(CORPUS.length);
  expect(new Set(shelf.map((issue) => issue.id)).size).toBe(shelf.length);
});

/** A cover is a front page, and a front page carries a picture — the rule the paper's own front already follows. */
test('every numéro opens on an item the paper printed that day, and on a picture', async () => {
  const days = new Map(CORPUS.map((article) => [article.id, issueIdAt(article.publishedAt)]));
  for (const issue of await contentApi.getIssues()) {
    expect(days.get(issue.opener.id)).toBe(issue.id);
    expect(issue.opener.hero).toBeDefined();
  }
});
