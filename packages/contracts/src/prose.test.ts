import { expect, test } from 'vitest';
import { judgeProse, readProse } from './index.ts';
import { RECORDED } from './recorded.ts';

/**
 * The judging answers whether a reading leaves a screen only prose; these answer whether this reading turns the
 * bodies the journal actually filed into the blocks a screen draws. One holds a rule, the others hold a measurement.
 */

const bodyOf = (article: Readonly<{ content_array: readonly string[] }>): string => article.content_array[0] ?? '';

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

test('the reading of this module leaves a screen nothing but prose', () => {
  expect(judgeProse(readProse)).toEqual([]);
});

test('an interview becomes the questions and the answers it is made of', () => {
  const blocks = readProse(bodyOf(RECORDED.opinionArticle));
  expect(blocks.filter((block) => block.type === 'heading').length).toBeGreaterThanOrEqual(2);
  expect(blocks.filter((block) => block.type === 'paragraph').length).toBeGreaterThanOrEqual(8);
  expect(blocks.every((block) => block.type === 'heading' || block.type === 'paragraph')).toBe(true);
});

test('a body that is only a donation form reads as no prose at all, rather than as the form', () => {
  expect(readProse(bodyOf(RECORDED.videoArticle))).toEqual([]);
});

test('a link of the journal keeps the address it points to', () => {
  const linked = readProse(bodyOf(RECORDED.opinionArticle)).flatMap((block) =>
    block.type === 'paragraph' ? block.spans.filter((span) => span.type === 'link') : [],
  );
  expect(linked.length).toBeGreaterThan(0);
  for (const span of linked) {
    expect(span.target.kind).toBe('external');
  }
});

test('the space between two runs of a sentence survives the reading', () => {
  expect(words(bodyOf(RECORDED.opinionArticle))).not.toMatch(/\p{Ll}\p{Lu}/u);
});

test('no headline of the « Sur le même thème » aside is read as a sentence of the article', () => {
  expect(words(bodyOf(RECORDED.opinionArticle))).not.toContain('Sur le même thème');
});

test('nothing the renderer wrote for a browser survives: no tag, no entity, no script', () => {
  const read = words(bodyOf(RECORDED.opinionArticle));
  expect(read).not.toMatch(/<[^>]*>/u);
  expect(read).not.toMatch(/&[a-z]+;|&#\d+;/iu);
  expect(read).not.toContain('function');
});
