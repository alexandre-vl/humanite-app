import { expect, expectTypeOf, test } from 'vitest';
import {
  DURATIONS,
  FONT_SIZES,
  FONT_WEIGHTS,
  LINE_HEIGHTS,
  PALETTE,
  RADII,
  REDUCED_DURATIONS,
  SPACING,
} from './index.ts';
import type { Color, Duration, FontSize, FontWeight, LineHeight, Radius, Space } from './index.ts';

test('the spacing scale is a four-point grid from zero', () => {
  expect(SPACING.none).toBe(0);
  expect(SPACING.md).toBe(12);
  expectTypeOf(SPACING.md).toEqualTypeOf<Space>();
});

test('radii, font sizes, line heights and weights are branded tokens', () => {
  expectTypeOf(RADII.pill).toEqualTypeOf<Radius>();
  expectTypeOf(FONT_SIZES.md).toEqualTypeOf<FontSize>();
  expect(FONT_SIZES.md).toBe(16);
  expectTypeOf(LINE_HEIGHTS.normal).toEqualTypeOf<LineHeight>();
  expectTypeOf(FONT_WEIGHTS.regular).toEqualTypeOf<FontWeight>();
  expect(FONT_WEIGHTS.bold).toBe('700');
});

test('durations have a reduced-motion counterpart of zero', () => {
  expectTypeOf(DURATIONS.normal).toEqualTypeOf<Duration>();
  expect(DURATIONS.normal).toBe(250);
  expect(REDUCED_DURATIONS.normal).toBe(0);
  expect(REDUCED_DURATIONS.slow).toBe(0);
});

test('the palette exposes the measured colours', () => {
  expect(PALETTE.uiRed).toBe('#f13c47');
  expectTypeOf(PALETTE.logoRed).toEqualTypeOf<Color>();
});
