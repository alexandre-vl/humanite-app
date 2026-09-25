import { expect, test } from 'vitest';
import { color } from './brand.ts';
import { lightnessStep } from './contrast.ts';
import { contrastRatio } from './index.ts';

test('black on white is the maximum contrast', () => {
  expect(contrastRatio(color('#000000'), color('#ffffff'))).toBeCloseTo(21, 5);
});

test('a colour against itself has no contrast', () => {
  expect(contrastRatio(color('#f13c47'), color('#f13c47'))).toBeCloseTo(1, 5);
});

test('contrast is symmetric', () => {
  const dark = color('#230434');
  const light = color('#ecf2f2');
  expect(contrastRatio(dark, light)).toBeCloseTo(contrastRatio(light, dark), 5);
});

/**
 * Through a screen's glass, the dark theme's first rule stood half as far from its page as the light theme's rule from
 * its own, where the ratio ranked it the further of the two: the step says what the eye saw, and the ratio did not.
 */
test('two dark colours stand closer through the glass than the ratio says', () => {
  const lightRule = [color('#dcd5e0'), color('#ffffff')] as const;
  const darkRule = [color('#3c3542'), color('#141414')] as const;
  expect(contrastRatio(...darkRule)).toBeGreaterThan(contrastRatio(...lightRule));
  expect(lightnessStep(...lightRule)).toBeCloseTo(13.15, 1);
  expect(lightnessStep(...darkRule)).toBeCloseTo(7.03, 1);
});

test('the step of lightness is the same either way', () => {
  const dark = color('#230434');
  const light = color('#ecf2f2');
  expect(lightnessStep(dark, light)).toBeCloseTo(lightnessStep(light, dark), 9);
});
