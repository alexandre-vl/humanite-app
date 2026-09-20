import { expect, expectTypeOf, test } from 'vitest';
import type { Theme } from './theme.ts';
import { LIGHT_THEME } from './theme.ts';
import type { TextTone, TextVariant } from './typography.ts';
import { TEXT_SCALES, TEXT_VARIANTS, TYPOGRAPHY, typographyAt } from './typography.ts';

/** The colour roles a text may take, each proven a real key of the theme by the `satisfies`. */
const TONE_ROLES = [
  'textPrimary',
  'textMuted',
  'onPrimary',
  'headline',
  'primary',
] as const satisfies readonly (keyof Theme)[];

test('the text tones are exactly the theme colour roles a text may take', () => {
  expectTypeOf<TextTone>().toEqualTypeOf<(typeof TONE_ROLES)[number]>();
  for (const role of TONE_ROLES) {
    expect(LIGHT_THEME).toHaveProperty(role);
  }
});

test('the typography table holds one style per variant, in order', () => {
  expect(Object.keys(TYPOGRAPHY)).toEqual([...TEXT_VARIANTS]);
  expectTypeOf<TextVariant>().toEqualTypeOf<
    'headline' | 'display' | 'title' | 'standfirst' | 'prose' | 'body' | 'label' | 'legend' | 'caption'
  >();
});

test('a line height derives from a size times its multiple', () => {
  expect(TYPOGRAPHY.body.size * TYPOGRAPHY.body.leading).toBeCloseTo(25.6); // 16 × 1.6
  expect(TYPOGRAPHY.title.size * TYPOGRAPHY.title.leading).toBeCloseTo(23); // 20 × 1.15
});

/**
 * The step the article captures measure, read at 2.625 px per point. The headline and the legend are the two roles the
 * scale reaches to within a point, so a step that drifts is a token someone changed without re-reading the capture.
 */
test('the reading roles step as the article captures measure them', () => {
  expect(TYPOGRAPHY.headline.size * TYPOGRAPHY.headline.leading).toBeCloseTo(47.6, 1); // mesuré 123,5 px = 47,0
  expect(TYPOGRAPHY.legend.size * TYPOGRAPHY.legend.leading).toBeCloseTo(16.8, 1); // mesuré 42,0 px = 16,0
});

test('the paper is set at the step it is written at, so nothing moves until a reader asks', () => {
  for (const variant of TEXT_VARIANTS) {
    expect(typographyAt(variant, 'normal')).toEqual(TYPOGRAPHY[variant]);
  }
});

/** The four stops the body text reads at, which is the range the current app's own slider covers. */
test('the steps set the body text at 14, 16, 18 and 20 points', () => {
  expect(TEXT_SCALES.map((scale) => typographyAt('body', scale).size)).toEqual([14, 16, 18, 20]);
});

test('every role at every step is a whole number of points, and grows with the step', () => {
  for (const variant of TEXT_VARIANTS) {
    const sizes = TEXT_SCALES.map((scale) => typographyAt(variant, scale).size);
    for (const size of sizes) {
      expect(Number.isInteger(size)).toBe(true);
    }
    expect(sizes).toEqual([...sizes].sort((left, right) => left - right));
  }
});

test('a step changes the size and nothing else, the line height following from it', () => {
  const large = typographyAt('prose', 'huge');
  expect(large.family).toBe(TYPOGRAPHY.prose.family);
  expect(large.leading).toBe(TYPOGRAPHY.prose.leading);
  expect(large.tone).toBe(TYPOGRAPHY.prose.tone);
  expect(large.size * large.leading).toBeCloseTo(32); // 20 × 1.6
});
