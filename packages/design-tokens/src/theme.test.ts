import { describe, expect, test } from 'vitest';
import { contrastRatio, PALETTE, THEMES } from './index.ts';
import type { Color, Theme } from './index.ts';

/** Every theme the tokens publish, read from the table instead of listed again beside it. */
const themes: readonly (readonly [string, Theme])[] = Object.entries(THEMES);

test('the tokens publish a light and a dark theme', () => {
  expect(Object.keys(THEMES)).toEqual(['light', 'dark']);
});

describe.each(themes)('%s theme', (name, theme) => {
  test(`${name}: primary text meets WCAG AA against the background`, () => {
    expect(contrastRatio(theme.textPrimary, theme.background)).toBeGreaterThanOrEqual(4.5);
  });

  test(`${name}: muted text meets WCAG AA for large text against the background`, () => {
    expect(contrastRatio(theme.textMuted, theme.background)).toBeGreaterThanOrEqual(3);
  });

  test(`${name}: text on the primary colour meets WCAG AA for large text`, () => {
    expect(contrastRatio(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(3);
  });

  test(`${name}: every colour it paints with is named in the palette`, () => {
    const named = new Set<Color>(Object.values(PALETTE));
    for (const [role, value] of Object.entries(theme)) {
      expect(named, role).toContain(value);
    }
  });
});
