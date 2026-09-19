import { expect, expectTypeOf, test } from 'vitest';
import type { Theme } from './theme.ts';
import { LIGHT_THEME } from './theme.ts';
import type { TextTone, TextVariant } from './typography.ts';
import { TEXT_VARIANTS, TYPOGRAPHY } from './typography.ts';

/** The colour roles a text may take, each proven a real key of the theme by the `satisfies`. */
const TONE_ROLES = ['textPrimary', 'textMuted', 'onPrimary', 'primary'] as const satisfies readonly (keyof Theme)[];

test('the text tones are exactly the theme colour roles a text may take', () => {
  expectTypeOf<TextTone>().toEqualTypeOf<(typeof TONE_ROLES)[number]>();
  for (const role of TONE_ROLES) {
    expect(LIGHT_THEME).toHaveProperty(role);
  }
});

test('the typography table holds one style per variant, in order', () => {
  expect(Object.keys(TYPOGRAPHY)).toEqual([...TEXT_VARIANTS]);
  expectTypeOf<TextVariant>().toEqualTypeOf<'display' | 'title' | 'standfirst' | 'body' | 'label' | 'caption'>();
});

test('a line height derives from a size times its multiple', () => {
  expect(TYPOGRAPHY.body.size * TYPOGRAPHY.body.leading).toBeCloseTo(25.6); // 16 × 1.6
  expect(TYPOGRAPHY.title.size * TYPOGRAPHY.title.leading).toBeCloseTo(23); // 20 × 1.15
});
