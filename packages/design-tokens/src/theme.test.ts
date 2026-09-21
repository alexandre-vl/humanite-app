import { describe, expect, test } from 'vitest';
import { contrastRatio, PALETTE, THEME_CHOICES, THEME_NAMES, THEMES } from './index.ts';
import type { Color, Theme } from './index.ts';

/** Every theme the tokens publish, read from the table instead of listed again beside it. */
const themes: readonly (readonly [string, Theme])[] = Object.entries(THEMES);

test('the tokens publish a light and a dark theme', () => {
  expect(THEME_NAMES).toEqual(['light', 'dark']);
});

/**
 * The names are the one list, and both the table and the reader's choices are read off it. Without this, a third
 * theme could reach the table and never be offered — or be offered and have no colours.
 */
test('every theme is named, every name has a theme, and every name can be chosen', () => {
  expect(Object.keys(THEMES)).toEqual([...THEME_NAMES]);
  expect(THEME_CHOICES).toEqual(['system', ...THEME_NAMES]);
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

/**
 * What every colour of text owes the ground it is printed on is not here, nor is what a drawn control owes: both are
 * derived by `legibility.ts` and the test beside it, one from the size the text is set in and one from the parts a
 * reader has to tell apart. What stayed here is what neither rule can reach — the two grounds of a feed telling each
 * other apart, and that every role is a colour the palette names.
 */
describe.each(themes)('%s theme', (name, theme) => {
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
