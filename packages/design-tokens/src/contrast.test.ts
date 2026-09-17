import { expect, test } from 'vitest';
import { color } from './brand.ts';
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
