import { expect, expectTypeOf, test } from 'vitest';
import { angle } from './brand.ts';
import {
  ANGLES,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  PALETTE,
  RADII,
  SIZES,
  SPACING,
  typographyAt,
} from './index.ts';
import type { Angle, Color, FontFamily, FontSize, LineHeight, Radius, Space } from './index.ts';

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
  expectTypeOf(FONT_FAMILIES.paper.regular).toEqualTypeOf<FontFamily>();
  expect(FONT_FAMILIES.paper.bold).toBe('Overpass_700Bold');
  expect(FONT_FAMILIES.paper.display).toBe('Anton_400Regular');
  expect(FONT_FAMILIES.legible.bold).toBe('AtkinsonHyperlegible_700Bold');
});

test('the palette exposes the measured colours', () => {
  expect(PALETTE.uiRed).toBe('#f13c47');
  expectTypeOf(PALETTE.uiRed).toEqualTypeOf<Color>();
});

test('the paper is laid at a turn to the left, written as React Native reads it', () => {
  expectTypeOf(ANGLES.paper).toEqualTypeOf<Angle>();
  expect(ANGLES.paper).toBe('-1.4deg');
  expect(angle(0)).toBe('0deg');
  expect(() => angle(Number.NaN)).toThrow(/angle invalide/u);
});

test('sizes give a list its bands and the scroll inset each arrangement adds up to', () => {
  // Sixteen points of air, one line of display type at the largest step a reader can choose, and what is left over
  // is the air the same name has on a screen that lays it in a plain scrolling page. Held against the table it is
  // derived from, so a change to the type or to the steps fails here rather than clipping a name on a phone.
  expect(SIZES.headerExpanded).toBe(48);
  const largest = typographyAt('display', 'huge', 'paper');
  expect(SPACING.lg + largest.size * largest.leading).toBeLessThan(SIZES.headerExpanded);
  expect(SIZES.band).toBe(40);
  expect(SIZES.bandPair).toBe(SIZES.band * 2);
  expect(SIZES.headerBand).toBe(SIZES.headerExpanded + SIZES.band);
  expect(SIZES.headerBandPair).toBe(SIZES.headerExpanded + SIZES.bandPair);
  expectTypeOf(SIZES.headerBandPair).toEqualTypeOf<Space>();
});

test('a bar keeps both its ends free for the square each of them holds', () => {
  expect(SIZES.bar).toBe(56);
  // The bar's margin and one touch target of the 48 points the grid keeps for one, at either end.
  expect(SIZES.barSide).toBe(SPACING.sm + SPACING.xxxl);
  expectTypeOf(SIZES.bar).toEqualTypeOf<Space>();
});
