import { expect, expectTypeOf, test } from 'vitest';
import type { Theme } from './theme.ts';
import { LIGHT_THEME } from './theme.ts';
import type { TextTone, TextVariant, Typography } from './typography.ts';
import { TEXT_SCALES, TEXT_VARIANTS, typographyAt } from './typography.ts';

/** The colour roles a text may take, each proven a real key of the theme by the `satisfies`. */
const TONE_ROLES = [
  'textPrimary',
  'textMuted',
  'onPrimary',
  'headline',
  'primary',
] as const satisfies readonly (keyof Theme)[];

/** A role as the paper sets it, at the step nobody has moved: the table as it stood before a reader could touch it. */
const paper = (variant: TextVariant): Typography => typographyAt(variant, 'normal', 'paper');

test('the text tones are exactly the theme colour roles a text may take', () => {
  expectTypeOf<TextTone>().toEqualTypeOf<(typeof TONE_ROLES)[number]>();
  for (const role of TONE_ROLES) {
    expect(LIGHT_THEME).toHaveProperty(role);
  }
});

test('the typography table answers for every variant, and for no other', () => {
  expectTypeOf<TextVariant>().toEqualTypeOf<
    'headline' | 'display' | 'title' | 'standfirst' | 'prose' | 'body' | 'label' | 'legend' | 'caption'
  >();
  for (const variant of TEXT_VARIANTS) {
    expect(paper(variant).size).toBeGreaterThan(0);
  }
});

test('a line height derives from a size times its multiple', () => {
  expect(paper('body').size * paper('body').leading).toBeCloseTo(25.6); // 16 × 1.6
  expect(paper('title').size * paper('title').leading).toBeCloseTo(23); // 20 × 1.15
});

/**
 * The step the article captures measure, read at 2.625 px per point. The headline and the legend are the two roles the
 * scale reaches to within a point, so a step that drifts is a token someone changed without re-reading the capture.
 */
test('the reading roles step as the article captures measure them', () => {
  expect(paper('headline').size * paper('headline').leading).toBeCloseTo(47.6, 1); // mesuré 123,5 px = 47,0
  expect(paper('legend').size * paper('legend').leading).toBeCloseTo(16.8, 1); // mesuré 42,0 px = 16,0
});

/** The four stops the body text reads at, which is the range the current app's own slider covers. */
test('the steps set the body text at 14, 16, 18 and 20 points', () => {
  expect(TEXT_SCALES.map((scale) => typographyAt('body', scale, 'paper').size)).toEqual([14, 16, 18, 20]);
});

test('every role at every step is a whole number of points, and grows with the step', () => {
  for (const variant of TEXT_VARIANTS) {
    const sizes = TEXT_SCALES.map((scale) => typographyAt(variant, scale, 'paper').size);
    for (const size of sizes) {
      expect(Number.isInteger(size)).toBe(true);
    }
    expect(sizes).toEqual([...sizes].sort((left, right) => left - right));
  }
});

test('a step changes the size and nothing else, the line height following from it', () => {
  const large = typographyAt('prose', 'huge', 'paper');
  expect(large.family).toBe(paper('prose').family);
  expect(large.leading).toBe(paper('prose').leading);
  expect(large.tone).toBe(paper('prose').tone);
  expect(large.size * large.leading).toBeCloseTo(32); // 20 × 1.6
});

/**
 * A reader who asks to read more easily gets that set everywhere: no role keeps a face of the paper's, which would
 * leave a headline or a caption in the one type they asked to be rid of.
 */
test('a set of faces answers for every role, and none falls back to the other set', () => {
  for (const variant of TEXT_VARIANTS) {
    expect(paper(variant).family).toMatch(/^(?:Overpass|Anton)_/u);
    expect(typographyAt(variant, 'normal', 'legible').family).toMatch(/^AtkinsonHyperlegible_/u);
  }
});

test('a set of faces changes the letters and nothing else', () => {
  const legible = typographyAt('prose', 'large', 'legible');
  const own = typographyAt('prose', 'large', 'paper');
  expect(legible.size).toBe(own.size);
  expect(legible.leading).toBe(own.leading);
  expect(legible.tone).toBe(own.tone);
  expect(legible.family).not.toBe(own.family);
});
