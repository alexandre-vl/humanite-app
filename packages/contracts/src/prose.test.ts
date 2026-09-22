import { expect, test } from 'vitest';
import { judgeProse, readPlain, readProse } from './index.ts';
import { RECORDED } from './recorded.ts';

/**
 * The judging answers whether a reading leaves a screen only prose; these answer whether this reading turns the
 * bodies and the lines the journal actually filed into the blocks and the words a screen draws. One holds a rule,
 * the others hold a measurement.
 *
 * The bodies are walked rather than named one by one: `pnpm capture:read` keys an article by the format the service
 * gave it, so a session that opens a kind of article no capture has shown yet is read by every case below without a
 * line changing here. Two tests do name a format, because what they assert is true of that format and of no other.
 *
 * The short fields are walked for the same reason and one more: they sit at every depth of every answer — a title
 * beside a post, a name beside a section — and naming them one by one would be a list to keep in step with the next
 * capture. What a screen shows on a line is the same five fields whatever answer carries them.
 */

/** Every body the capture in the repository holds, by the format the journal gave it. */
const BODIES = Object.entries(RECORDED.articles).map(([format, article]) => ({
  format,
  html: article.content_array[0],
}));

/** What a screen puts on a line rather than in a paragraph, whichever answer of the service carries it. */
const SHORT = ['title', 'description', 'excerpt', 'image_caption', 'name'] as const;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every short field of every answer the capture kept, at whatever depth the answer holds it. */
const shortFieldsOf = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => shortFieldsOf(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  const own = SHORT.flatMap((key) => {
    const text = value[key];
    return typeof text === 'string' && text !== '' ? [text] : [];
  });
  return [...own, ...Object.values(value).flatMap((child: unknown) => shortFieldsOf(child))];
};

const LINES = shortFieldsOf(RECORDED);

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

test('the readings of this module leave a screen nothing but text a reader should see', () => {
  expect(judgeProse({ prose: readProse, plain: readPlain })).toEqual([]);
});

test('the capture in the repository holds a body to read', () => {
  expect(BODIES.length).toBeGreaterThan(0);
});

test('the capture in the repository holds short fields to read', () => {
  expect(LINES.length).toBeGreaterThan(50);
});

test('no short field of the service reaches a screen carrying a tag', () => {
  expect(LINES.filter((html) => /<[^>]*>/u.test(readPlain(html)))).toEqual([]);
});

test('no short field of the service reaches a screen carrying an entity', () => {
  expect(LINES.filter((html) => /&[a-z]+;|&#\d+;/iu.test(readPlain(html)))).toEqual([]);
});

test('no short field of the service reaches a screen with the blank its template left at the edges', () => {
  expect(LINES.filter((html) => readPlain(html) !== readPlain(html).trim())).toEqual([]);
});

test('the space the journal writes so a line will not break there survives the reading', () => {
  const spaced = LINES.filter((html) => html.includes('&nbsp;'));
  expect(spaced.length).toBeGreaterThan(0);
  expect(spaced.filter((html) => !readPlain(html).includes('\u00A0'))).toEqual([]);
});

test.each(BODIES)(
  '$format: nothing the renderer wrote for a browser survives — no tag, no entity, no script',
  ({ html }) => {
    const read = words(html);
    expect(read).not.toMatch(/<[^>]*>/u);
    expect(read).not.toMatch(/&[a-z]+;|&#\d+;/iu);
    expect(read).not.toContain('function');
  },
);

test.each(BODIES)('$format: nothing the journal closes an article with survives', ({ html }) => {
  const read = words(html);
  expect(read).not.toContain('Sur le même thème');
  expect(read).not.toContain('form_don');
});

test.each(BODIES)('$format: the space between two runs of a sentence survives the reading', ({ html }) => {
  expect(words(html)).not.toMatch(/\p{Ll}\p{Lu}/u);
});

test.each(BODIES)('$format: every block is one of the kinds a screen knows how to draw', ({ html }) => {
  const kinds = new Set(readProse(html).map((block) => block.type));
  expect([...kinds].every((kind) => kind === 'heading' || kind === 'paragraph' || kind === 'quote')).toBe(true);
});

test('an interview becomes the questions and the answers it is made of', () => {
  const blocks = readProse(RECORDED.articles.opinion.content_array[0]);
  expect(blocks.filter((block) => block.type === 'heading').length).toBeGreaterThanOrEqual(2);
  expect(blocks.filter((block) => block.type === 'paragraph').length).toBeGreaterThanOrEqual(8);
});

test('a body that is only a donation form reads as no prose at all, rather than as the form', () => {
  expect(readProse(RECORDED.articles.video.content_array[0])).toEqual([]);
});

test('a link of the journal keeps the address it points to', () => {
  const linked = readProse(RECORDED.articles.opinion.content_array[0]).flatMap((block) =>
    block.type === 'paragraph' ? block.spans.filter((span) => span.type === 'link') : [],
  );
  expect(linked.length).toBeGreaterThan(0);
  for (const span of linked) {
    expect(span.target.kind).toBe('external');
  }
});
