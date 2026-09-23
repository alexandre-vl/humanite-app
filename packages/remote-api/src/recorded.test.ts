import {
  blocksOf,
  PICTURE,
  readArticle,
  readList,
  readMenu,
  readPlain,
  readProse,
  readSummaries,
  SECTIONS_KEY,
} from '@huma/contracts';
import { expect, test } from 'vitest';
import { RECORDED } from './recorded.ts';

/**
 * The readings of the contracts, held against what the journal's service actually answered.
 *
 * The contracts hold each reading to its rule on samples written for the purpose; these hold them to the answers a
 * capture recorded, which is a measurement and not a rule — and the measurement is what a new capture moves, so the
 * answers are walked rather than counted, and a route or a format no capture has shown yet is read by every case
 * below without a line changing here. They live beside the client because the answers do: they are the answers of the
 * service this package asks.
 */

/** Every list the capture kept, by the route that answered it. */
const LISTS = [
  { route: 'front', answer: RECORDED.front.answer },
  { route: 'wire', answer: RECORDED.wire.answer },
  { route: 'section', answer: RECORDED.section.answer },
  { route: 'search', answer: RECORDED.search.answer },
] as const;

/** Every body the capture holds, by the format the journal gave it. */
const ARTICLES = Object.entries(RECORDED.articles).map(([format, kept]) => ({ format, answer: kept.answer }));

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every value held under one of `keys`, at whatever depth of whatever answer holds it. */
const fieldsOf = (value: unknown, keys: readonly string[]): readonly string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => fieldsOf(item, keys));
  }
  if (!isRecord(value)) {
    return [];
  }
  const own = keys.flatMap((key) => {
    const text = value[key];
    return typeof text === 'string' && text !== '' ? [text] : [];
  });
  return [...own, ...Object.values(value).flatMap((child: unknown) => fieldsOf(child, keys))];
};

/** What a screen puts on a line rather than in a paragraph, whichever answer of the service carries it. */
const LINES = fieldsOf(RECORDED, ['title', 'description', 'excerpt', 'image_caption', 'name']);

/** Every picture address the capture kept. */
const IMAGES = fieldsOf(RECORDED, ['image']);

/** What a reading made of a body, run together, so a whole can be searched for what should not be in it. */
const words = (html: string): string =>
  readProse(html)
    .map((block) => {
      if (block.type === 'heading') {
        return block.text;
      }
      if (block.type === 'paragraph' || block.type === 'quote') {
        return block.spans.map((span) => ('value' in span ? span.value : span.text)).join('');
      }
      return '';
    })
    .join('\n');

test('the capture holds lists, bodies, short fields and pictures to read', () => {
  expect(ARTICLES.length).toBeGreaterThan(0);
  expect(LINES.length).toBeGreaterThan(50);
  expect(IMAGES.length).toBeGreaterThan(10);
});

test.each(LISTS)(
  '$route: every item the service answered is read, in its order, and none is set aside',
  ({ answer }) => {
    const read = readList(answer);
    if (!('item' in read)) {
      throw new Error(read.refused);
    }
    expect(read.item.intake.setAside).toEqual([]);
    expect(read.item.intake.kept.map((summary) => summary.id)).toEqual(answer.posts.map((post) => post.id));
    expect(read.item.sent).toBe(answer.posts.length);
  },
);

test.each(LISTS)('$route: no title or standfirst reaches the domain carrying the journal’s markup', ({ answer }) => {
  const lines = readSummaries(answer.posts).kept.flatMap((summary) => [summary.title, summary.standfirst]);
  expect(lines.filter((line) => /<[^>]*>|&[a-z]+;|&#\d+;/iu.test(line))).toEqual([]);
  expect(lines.filter((line) => line === '')).toEqual([]);
});

/** The recorded section's list is found in the menu by the number in its own path, and not named by hand. */
test('an item of a section’s own list is placed in that section, and an item of the front page in none', () => {
  const menu = readMenu(RECORDED.menu.answer);
  if (!('item' in menu)) {
    throw new Error(menu.refused);
  }
  const listed = menu.item.kept.find((each) => RECORDED.section.path === `/wordpress/${each.serviceId}/posts/`);
  if (listed === undefined) {
    throw new Error('la rubrique enregistrée manque au menu enregistré');
  }
  const { section } = listed;
  const own = readSummaries(RECORDED.section.answer.posts, { section: section.id }).kept;
  expect(own.every((summary) => summary.section === section.id)).toBe(true);
  expect(readSummaries(RECORDED.front.answer.posts).kept.every((summary) => summary.section === undefined)).toBe(true);
});

test('the menu is read whole, in the newsroom’s order, each section with the id its list is filed under', () => {
  const menu = readMenu(RECORDED.menu.answer);
  if (!('item' in menu)) {
    throw new Error(menu.refused);
  }
  expect(menu.item.setAside).toEqual([]);
  expect(menu.item.kept).toHaveLength(RECORDED.menu.answer[SECTIONS_KEY].length);
  expect(menu.item.kept[0]).toEqual({ section: { id: 'politique', label: 'Politique' }, serviceId: '19565' });
});

test('a date of the service is read on the newsroom’s clock, not as UTC', () => {
  const [first] = RECORDED.wire.answer.posts;
  const [read] = readSummaries(RECORDED.wire.answer.posts).kept;
  expect(first.date).toMatch(/^2026-09-21T/u);
  expect(Date.parse(read?.publishedAt ?? '')).toBe(Date.parse(`${first.date}+02:00`));
});

test('a picture of the journal comes through as the journal’s, with the words under it read as a line', () => {
  const illustrated = readSummaries(RECORDED.front.answer.posts).kept.filter((summary) => summary.hero !== undefined);
  expect(illustrated.length).toBeGreaterThan(0);
  for (const summary of illustrated) {
    expect(summary.hero?.picture.kind).toBe('journal');
    expect(summary.hero?.caption ?? '').not.toMatch(/<[^>]*>|&[a-z]+;|&#\d+;/iu);
  }
});

test('every picture the journal served is one the contracts read as the journal’s', () => {
  expect(IMAGES.filter((url) => !PICTURE.safeParse({ kind: 'journal', url }).success)).toEqual([]);
});

test('no short field of the service reaches a screen carrying a tag, an entity or a blank at its edges', () => {
  expect(LINES.filter((html) => /<[^>]*>/u.test(readPlain(html)))).toEqual([]);
  expect(LINES.filter((html) => /&[a-z]+;|&#\d+;/iu.test(readPlain(html)))).toEqual([]);
  expect(LINES.filter((html) => readPlain(html) !== readPlain(html).trim())).toEqual([]);
});

test('the space the journal writes so a line will not break there survives the reading', () => {
  const spaced = LINES.filter((html) => html.includes('&nbsp;'));
  expect(spaced.length).toBeGreaterThan(0);
  expect(spaced.filter((html) => !readPlain(html).includes('\u00A0'))).toEqual([]);
});

test.each(ARTICLES)('$format: the article is read whole, and its body is blocks a screen knows', ({ answer }) => {
  const read = readArticle(answer);
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  const kinds = new Set(blocksOf(read.item).map((block) => block.type));
  expect([...kinds].every((kind) => kind === 'heading' || kind === 'paragraph' || kind === 'quote')).toBe(true);
});

test.each(ARTICLES)(
  '$format: nothing written for a browser, nor the close of every article, survives',
  ({ answer }) => {
    const read = words(answer.content_array[0]);
    expect(read).not.toMatch(/<[^>]*>/u);
    expect(read).not.toMatch(/&[a-z]+;|&#\d+;/iu);
    expect(read).not.toContain('function');
    expect(read).not.toContain('Sur le même thème');
    expect(read).not.toContain('form_don');
    expect(read).not.toMatch(/\p{Ll}\p{Lu}/u);
  },
);

test('an interview becomes the questions and the answers it is made of, and keeps where its links point', () => {
  const read = readArticle(RECORDED.articles.opinion.answer);
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  const blocks = blocksOf(read.item);
  expect(read.item.format).toBe('column');
  expect(blocks.filter((block) => block.type === 'heading').length).toBeGreaterThanOrEqual(2);
  expect(blocks.filter((block) => block.type === 'paragraph').length).toBeGreaterThanOrEqual(8);
  const linked = blocks.flatMap((block) =>
    block.type === 'paragraph' ? block.spans.filter((span) => span.type === 'link') : [],
  );
  expect(linked.length).toBeGreaterThan(0);
  expect(linked.every((span) => span.target.kind === 'external')).toBe(true);
});

test('a video of the journal is read as a video, with its body open', () => {
  const read = readArticle(RECORDED.articles.video.answer);
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  expect(read.item.format).toBe('video');
  expect(read.item.body.kind).toBe('open');
});

/** The recorded column as an answer that holds every field of the item and no body. */
const BODILESS = Object.fromEntries(
  Object.entries(RECORDED.articles.opinion.answer).filter(([field]) => field !== 'content_array'),
);

/**
 * The service answers every list without a token, and there `right` only repeats `premium`; on an article it is the
 * reader's own. Asked for a reserved article without a token, it sends the item and no body at all — measured on the
 * phone, 23/09/2026. A body sent beside `right: false` would not be this reader's either, and reading it would unlock
 * it: both shapes are withheld, and nothing of a body is read.
 */
test.each([
  { shape: 'the item alone, as the service answers it', answer: { ...BODILESS, right: false } },
  { shape: 'a body beside the refusal', answer: { ...RECORDED.articles.opinion.answer, right: false } },
])('a reserved article is read as withheld — $shape', ({ answer }) => {
  const read = readArticle(answer);
  if (!('item' in read)) {
    throw new Error(read.refused);
  }
  expect(read.item.body).toEqual({ kind: 'withheld' });
  expect(read.item.title).toBe(readPlain(RECORDED.articles.opinion.answer.title));
  expect(JSON.stringify(read.item)).not.toContain('paragraph');
});

/** One odd item costs the list nothing but itself: set aside where it sat, with its reason, the rest served. */
test('an item the schemas cannot read is set aside where it sat, and the rest are served', () => {
  const [first] = RECORDED.front.answer.posts;
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

/** A reason names the value it refused: a shape nobody has seen is known by its name the first time it comes. */
test('the reason an item is set aside names what the service sent, and not only where', () => {
  const [first] = RECORDED.front.answer.posts;
  const [aside] = readSummaries([{ ...first, article_format: 'podcast' }]).setAside;
  expect(aside?.says).toMatch(/^article_format : .* \(reçu « podcast »\)$/u);
});

/** `live` came on the phone's wire after the capture: the running coverage of an event, an article that grows. */
test('an item of running coverage is read as an article', () => {
  const [first] = RECORDED.front.answer.posts;
  const intake = readSummaries([{ ...first, article_format: 'live' }]);
  expect(intake.setAside).toEqual([]);
  expect(intake.kept.map((summary) => summary.format)).toEqual(['article']);
});

test('a list of which no item could be read is refused, and says why; an empty one is a list holding nothing', () => {
  const unread = readList({ posts: RECORDED.wire.answer.posts.map((post) => ({ ...post, date: 'hier soir' })) });
  expect('refused' in unread && unread.refused).toContain('hier soir');
  expect(readList({ posts: [] })).toEqual({ item: { intake: { kept: [], setAside: [] }, sent: 0 } });
});

test.each([
  {
    shape: 'a body that is not the service’s',
    answer: { ...RECORDED.articles.opinion.answer, content_array: 'pas une liste' },
    received: '« pas une liste »',
  },
  { shape: 'no body where the reader has a right to one', answer: BODILESS, received: 'rien' },
])('an article with $shape is refused with its reason, not read as an empty one', ({ answer, received }) => {
  const read = readArticle(answer);
  expect('refused' in read && read.refused).toContain('content_array');
  expect('refused' in read && read.refused).toContain(`(reçu ${received})`);
});
