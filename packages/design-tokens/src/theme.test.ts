import { describe, expect, test } from 'vitest';
import { contrastRatio, PALETTE, THEMES } from './index.ts';
import type { Color, Theme } from './index.ts';

/** Every theme the tokens publish, read from the table instead of listed again beside it. */
const themes: readonly (readonly [string, Theme])[] = Object.entries(THEMES);

test('the tokens publish a light and a dark theme', () => {
  expect(Object.keys(THEMES)).toEqual(['light', 'dark']);
});

/**
 * The premium yellow is one value in both themes, so — like the paper's red, which is why `onPrimary` exists — it
 * cannot ask for two different texts on it. What has to hold is the light theme's, because the mark is named light
 * wherever it is printed: read in the reader's theme it took the dark theme's own pale text and measured 1.30 to 1
 * against the yellow, a word painted in a colour nobody can read it in, on the one card that tells a reader they
 * must pay to read further. Nothing reported it — no rule here asked what a theme's text does on its own premium.
 */
test('the premium yellow is one value, and carries the light theme’s text', () => {
  expect(THEMES.dark.premium).toBe(THEMES.light.premium);
  expect(contrastRatio(THEMES.light.textPrimary, THEMES.light.premium)).toBeGreaterThanOrEqual(4.5);
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

  /**
   * A feed prints its blocks on two grounds in turn, and the same words are read on both. The page's own ground is
   * held above; this is the other one, which nothing held until the blocks alternated onto it.
   */
  test(`${name}: text holds on the ground a block alternates onto`, () => {
    expect(contrastRatio(theme.textPrimary, theme.block)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.textMuted, theme.block)).toBeGreaterThanOrEqual(3);
  });

  /**
   * And the alternation has to be seen at all. WCAG asks nothing of two grounds carrying the same words, so the bar
   * here is only that the second ground is a second ground: the values the paper alternates on measure 1.13 to 1 in
   * the light theme and 1.19 in the dark. What this refuses is the shortcut of reaching for a role that happens to
   * equal the page in one theme — the reading screen's ground does, and the alternation would simply not be there.
   */
  test(`${name}: the two grounds of a feed can be told apart`, () => {
    expect(contrastRatio(theme.background, theme.block)).toBeGreaterThan(1.1);
  });

  test(`${name}: every colour it paints with is named in the palette`, () => {
    const named = new Set<Color>(Object.values(PALETTE));
    for (const [role, value] of Object.entries(theme)) {
      expect(named, role).toContain(value);
    }
  });
});
