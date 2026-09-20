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

  /**
   * A control is not text: what has to be found is its own shape, and WCAG asks three to one of the parts that say
   * which state it is in. The switch of the settings screen is drawn from these roles — the ground is its knob, the
   * muted colour its track when off, the primary colour its track when on — after a version drawn from the border
   * and the surface measured 1.13 to 1 against the page on a real phone, on the screen a reader opens precisely
   * because they cannot see well. The muted colour is already held against the ground above; this is the other pair.
   */
  test(`${name}: a control drawn on the primary colour keeps its own shape`, () => {
    expect(contrastRatio(theme.background, theme.primary)).toBeGreaterThanOrEqual(3);
  });

  test(`${name}: every colour it paints with is named in the palette`, () => {
    const named = new Set<Color>(Object.values(PALETTE));
    for (const [role, value] of Object.entries(theme)) {
      expect(named, role).toContain(value);
    }
  });
});
