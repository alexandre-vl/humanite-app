import { describe, expect, test } from 'vitest';
import { contrastRatio, DARK_THEME, LIGHT_THEME, THEMES } from './index.ts';
import type { Theme } from './index.ts';

const themes: readonly (readonly [string, Theme])[] = [
  ['light', LIGHT_THEME],
  ['dark', DARK_THEME],
];

describe.each(themes)('%s theme', (name, theme) => {
  test(`${name}: primary text meets WCAG AA against the background`, () => {
    expect(contrastRatio(theme.textPrimary, theme.background)).toBeGreaterThanOrEqual(4.5);
  });

  test(`${name}: muted text meets WCAG AA for large text against the background`, () => {
    expect(contrastRatio(theme.textMuted, theme.background)).toBeGreaterThanOrEqual(3);
  });
});

test('THEMES holds the light and dark themes', () => {
  expect(THEMES.light).toBe(LIGHT_THEME);
  expect(THEMES.dark).toBe(DARK_THEME);
});
