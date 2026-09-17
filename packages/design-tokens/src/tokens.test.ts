import { expect, expectTypeOf, test } from 'vitest';
import {
  DURATIONS,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  PALETTE,
  RADII,
  REDUCED_DURATIONS,
  SIZES,
  SPACING,
} from './index.ts';
import type { Color, Duration, FontFamily, FontSize, LineHeight, Radius, Space } from './index.ts';

test('the spacing scale is a four-point grid from zero', () => {
  expect(SPACING.none).toBe(0);
  expect(SPACING.md).toBe(12);
  expectTypeOf(SPACING.md).toEqualTypeOf<Space>();
});

test('radii, font sizes, line heights and families are branded tokens', () => {
  expectTypeOf(RADII.pill).toEqualTypeOf<Radius>();
  expectTypeOf(FONT_SIZES.md).toEqualTypeOf<FontSize>();
  expect(FONT_SIZES.md).toBe(16);
  expectTypeOf(LINE_HEIGHTS.normal).toEqualTypeOf<LineHeight>();
  expectTypeOf(FONT_FAMILIES.body.regular).toEqualTypeOf<FontFamily>();
  expect(FONT_FAMILIES.body.bold).toBe('Overpass_700Bold');
  expect(FONT_FAMILIES.display).toBe('Anton_400Regular');
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

test('sizes give the collapsible header its bands and the scroll inset they add up to', () => {
  expect(SIZES.headerExpanded).toBe(64);
  expect(SIZES.sectionBar).toBe(40);
  expect(SIZES.headerBlock).toBe(SIZES.headerExpanded + SIZES.sectionBar);
  expectTypeOf(SIZES.headerBlock).toEqualTypeOf<Space>();
});
