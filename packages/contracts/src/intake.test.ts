import { expect, test } from 'vitest';
import { blocksOf, judgeIntake, readArticle, readPlain, readSummaries, SECTION_ID } from './index.ts';
import { RECORDED } from './recorded.ts';

/**
 * The judging answers whether a reading holds the rule; these answer whether this reading, handed what the journal's
 * service actually answered, serves it all, in its order, as the domain's own values. One holds a rule, the others a
 * measurement — and the measurement is the one a new capture moves, so the lists are walked rather than counted.
 */

/** Every list the capture kept, by the route that answered it. */
const LISTS = {
  front: RECORDED.front.posts,
  wire: RECORDED.wire.posts,
  sectionFeed: RECORDED.sectionFeed.posts,
  search: RECORDED.search.posts,
} as const;

const ROUTES = Object.entries(LISTS).map(([route, posts]) => ({ route, posts }));

test('the reading of this module serves what it reads, all of it, in order, and names the rest', () => {
  expect(judgeIntake(readSummaries)).toEqual([]);
});

test.each(ROUTES)('$route: every item the service answered is read, and none is set aside', ({ posts }) => {
  const intake = readSummaries(posts);
  expect(intake.setAside).toEqual([]);
  expect(intake.kept).toHaveLength(posts.length);
});

test.each(ROUTES)('$route: the items are served in the order the service sent them', ({ posts }) => {
  expect(readSummaries(posts).kept.map((summary) => summary.id)).toEqual(posts.map((post) => post.id));
});

test.each(ROUTES)('$route: no title or standfirst reaches the domain carrying the journal’s markup', ({ posts }) => {
  const lines = readSummaries(posts).kept.flatMap((summary) => [summary.title, summary.standfirst]);
  expect(lines.filter((line) => /<[^>]*>|&[a-z]+;|&#\d+;/iu.test(line))).toEqual([]);
  expect(lines.filter((line) => line === '')).toEqual([]);
});

test('an item of a section’s own list is placed in that section, and an item of the front page in none', () => {
  // The recorded list is the service's section 19573, which its menu calls `histoire`.
  const section = SECTION_ID.parse('histoire');
  expect(readSummaries(LISTS.sectionFeed, { section }).kept.every((summary) => summary.section === section)).toBe(true);
  expect(readSummaries(LISTS.front).kept.every((summary) => summary.section === undefined)).toBe(true);
});

test('a date of the service is read on the newsroom’s clock, not as UTC', () => {
  const [first] = LISTS.wire;
  const [read] = readSummaries(LISTS.wire).kept;
  expect(first.date).toMatch(/^2026-09-21T/u);
  expect(read?.publishedAt).toMatch(/Z$/u);
  expect(Date.parse(read?.publishedAt ?? '')).toBe(Date.parse(`${first.date}+02:00`));
});

test('a picture of the journal comes through as the journal’s, with the words under it read as a line', () => {
  const illustrated = readSummaries(LISTS.front).kept.filter((summary) => summary.hero !== undefined);
  expect(illustrated.length).toBeGreaterThan(0);
  for (const summary of illustrated) {
    expect(summary.hero?.picture.kind).toBe('journal');
    expect(summary.hero?.caption ?? '').not.toMatch(/<[^>]*>|&[a-z]+;|&#\d+;/iu);
  }
});

/**
 * One odd item costs the list nothing but itself. The service lists a fifth format one day, a date nobody can read
 * the next: each is set aside where it sat, with its reason, and the items around it are served as before.
 */
test('an item the schemas cannot read is set aside where it sat, and the rest are served', () => {
  const [first] = LISTS.front;
  const odd = [
    first,
    { ...first, id: '3999997', article_format: 'podcast' },
    { ...first, id: '3999998', date: 'hier matin' },
    { ...first, id: '3999999' },
  ];
  const intake = readSummaries(odd);
  expect(intake.setAside.map((aside) => aside.at)).toEqual([1, 2]);
  expect(intake.setAside[0]?.says).toContain('article_format');
  expect(intake.setAside[1]?.says).toContain('hier matin');
  expect(intake.kept.map((summary) => summary.id)).toEqual([first.id, '3999999']);
});

test('every article the capture kept is read whole, as its format says', () => {
  const opinion = readArticle(RECORDED.articles.opinion);
  const video = readArticle(RECORDED.articles.video);
  if (!('item' in opinion) || !('item' in video)) {
    throw new Error('un article de la capture n’a pas été lu');
  }
  expect(opinion.item.format).toBe('column');
  expect(blocksOf(opinion.item).filter((block) => block.type === 'paragraph').length).toBeGreaterThanOrEqual(8);
  expect(video.item.format).toBe('video');
  expect(video.item.body).toEqual({ kind: 'open', blocks: [] });
});

/**
 * The service answers every list without a token, and there `right` only repeats `premium`; on an article it is the
 * reader's own. What it sends beside `right: false` is not this reader's body, and reading it would unlock it.
 */
test('an article the service withholds from this reader is read as withheld, and nothing of its body is read', () => {
  const read = readArticle({ ...RECORDED.articles.opinion, right: false });
  if (!('item' in read)) {
    throw new Error('l’article retenu n’a pas été lu');
  }
  expect(read.item.body).toEqual({ kind: 'withheld' });
  expect(read.item.title).toBe(readPlain(RECORDED.articles.opinion.title));
  expect(JSON.stringify(read.item)).not.toContain('paragraph');
});

test('an article whose body is not the service’s is refused with its reason, not read as an empty one', () => {
  const read = readArticle({ ...RECORDED.articles.opinion, content_array: 'pas une liste' });
  expect('refused' in read && read.refused).toContain('content_array');
});
