import { expect, test } from 'vitest';
import { readList, readMenu } from './index.ts';
import { RECORDED } from './recorded.ts';
import { REMOTE_ARTICLE, SECTIONS_KEY } from './remote.ts';

/**
 * These hold the readings of the service's lists against what it actually answered, not against what we remember of
 * it. A reading written from a capture and never replayed on it is a guess; replayed, it is a measurement.
 */

const LISTS = [
  { label: 'the front', answer: RECORDED.front },
  { label: 'the wire', answer: RECORDED.wire },
  { label: 'a section', answer: RECORDED.sectionFeed },
  { label: 'a search', answer: RECORDED.search },
] as const;

test.each(LISTS)('readList reads every item the service answered for $label', ({ answer }) => {
  const read = readList(answer);
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  expect(read.item.intake.setAside).toEqual([]);
  expect(read.item.intake.kept).toHaveLength(answer.posts.length);
  expect(read.item.sent).toBe(answer.posts.length);
});

/** The envelope is read whole and its items one by one: one odd item costs itself, never the thirty around it. */
test('readList sets an odd item aside and serves the rest, and counts it among what the service sent', () => {
  const [first, ...rest] = RECORDED.sectionFeed.posts;
  const read = readList({ posts: [{ ...first, article_format: 'podcast' }, ...rest] });
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  expect(read.item.intake.kept).toHaveLength(rest.length);
  expect(read.item.intake.setAside.map((each) => each.at)).toEqual([0]);
  expect(read.item.sent).toBe(rest.length + 1);
});

test('readList refuses a list of which no item could be read, and says why', () => {
  const read = readList({ posts: RECORDED.wire.posts.map((post) => ({ ...post, date: 'hier soir' })) });
  expect('refused' in read && read.refused).toContain('hier soir');
});

test('readList reads an empty list as a list holding nothing, and an answer holding no list as none', () => {
  expect(readList({ posts: [] })).toEqual({ item: { intake: { kept: [], setAside: [] }, sent: 0 } });
  expect('refused' in readList({ articles: [] })).toBe(true);
});

/** The menu is the newsroom's order and nothing else says it; each section keeps the number its list is filed under. */
test('readMenu reads the journal’s eleven sections in its order, each with the id its list is filed under', () => {
  const read = readMenu(RECORDED.sections);
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  expect(read.item.setAside).toEqual([]);
  expect(read.item.kept.map((listed) => listed.section.id)).toEqual([
    'politique',
    'social-eco',
    'societe',
    'monde',
    'culture-et-savoir',
    'feminisme',
    'environnement',
    'sciences',
    'medias',
    'en-debat',
    'histoire',
  ]);
  expect(read.item.kept[0]).toEqual({ section: { id: 'politique', label: 'Politique' }, serviceId: '19565' });
});

test('readMenu sets aside a section whose slug is no slug, and keeps the others', () => {
  const [first, ...rest] = RECORDED.sections[SECTIONS_KEY];
  const read = readMenu({ [SECTIONS_KEY]: [{ ...first, slug: 'Politique & Cie' }, ...rest] });
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  expect(read.item.kept).toHaveLength(rest.length);
  expect(read.item.setAside.map((each) => each.at)).toEqual([0]);
});

/** Every article the capture holds, by the format the journal gave it: a new format is read without a line here. */
const ARTICLES = Object.entries(RECORDED.articles).map(([format, body]) => ({ format, body }));

test.each(ARTICLES)('REMOTE_ARTICLE reads a body the service filed as $format', ({ body }) => {
  const article = REMOTE_ARTICLE.parse(body);
  expect(article.content_array).toHaveLength(1);
  expect(article.content_array[0] ?? '').toContain('form_don');
});

test('REMOTE_ARTICLE refuses an answer with no body, which a feed item nonetheless is', () => {
  expect(REMOTE_ARTICLE.safeParse(RECORDED.sectionFeed.posts[0]).success).toBe(false);
});
