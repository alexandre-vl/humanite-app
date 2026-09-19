import { expect, expectTypeOf, test } from 'vitest';
import type { Theme } from './theme.ts';
import { LIGHT_THEME } from './theme.ts';
import type { TextTone, TextVariant } from './typography.ts';
import { TEXT_VARIANTS, TYPOGRAPHY } from './typography.ts';

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
