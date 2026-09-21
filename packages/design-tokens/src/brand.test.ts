import { expect, test } from 'vitest';
import { color, fontFamily, fontSize, lineHeight, radius, space, tracking } from './brand.ts';

test('constructors accept valid values and return them', () => {
  expect(space(8)).toBe(8);
  expect(radius(12)).toBe(12);
  expect(fontSize(16)).toBe(16);
  expect(lineHeight(1.4)).toBe(1.4);
  // Zero is a value here and not an absence: most roles ask for no air between their letters, and say so.
  expect(tracking(0)).toBe(0);
  expect(tracking(0.06)).toBe(0.06);
  expect(fontFamily('Overpass_400Regular')).toBe('Overpass_400Regular');
  expect(color('#e30613')).toBe('#e30613');
});

test('constructors reject invalid values', () => {
  expect(() => space(-1)).toThrow(RangeError);
  expect(() => fontSize(0)).toThrow(RangeError);
  expect(() => fontFamily('')).toThrow(RangeError);
  expect(() => color('#fff')).toThrow(RangeError);
  expect(() => color('red')).toThrow(RangeError);
  expect(() => tracking(-0.1)).toThrow(RangeError);
});
