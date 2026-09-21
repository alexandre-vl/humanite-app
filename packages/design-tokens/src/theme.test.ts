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
 * The paper's name is the one thing that does not change with the page it is printed on. It is held beside the
 * premium yellow because it is the same kind of fact: one value, both themes, and a reason — there the mark builds
 * itself in a forced light scope, here the mark is the paper.
 */
test('the paper’s name is one red, whichever page it is printed on', () => {
  expect(THEMES.dark.mark).toBe(THEMES.light.mark);
  expect(THEMES.light.mark).toBe(PALETTE.uiRed);
});

/**
 * What every colour of text owes the ground it is printed on is not here, nor is what a drawn control owes: both are
 * derived by `legibility.ts` and the test beside it, one from the size the text is set in and one from the parts a
 * reader has to tell apart. What stayed here is what neither rule can reach — the order of the three inks, the rule
 * being visible at all, and that every role is a colour the palette names.
 *
 * A fourth stood here and is gone with what it held: the two grounds a feed alternated between had to be told apart,
 * and the paper alternates between no two grounds now. It prints on one and draws a rule where a card ends.
 */
describe.each(themes)('%s theme', (name, theme) => {
  /**
   * The three inks have to be three. What `legibility.ts` asks of each is that it be readable on its ground, and two
   * roles holding the very same value answer that perfectly while saying nothing — which is what the paper did: a
   * card's title and the sentence under it were printed in one colour, and the order they are read in rested on four
   * points of size. The bar here is the order itself, and that each step is a step: a third of the contrast of the
   * one above it, at least, so no two of them can be mistaken for one.
   */
  test(`${name}: the three inks step down, each clearly lighter than the one above`, () => {
    const onPage = (tone: 'textPrimary' | 'textSecondary' | 'textMuted'): number =>
      contrastRatio(theme[tone], theme.background);
    expect(onPage('textPrimary')).toBeGreaterThan(onPage('textSecondary') * 1.3);
    expect(onPage('textSecondary')).toBeGreaterThan(onPage('textMuted') * 1.3);
  });

  /**
   * A line drawn where nobody sees one is not a line. WCAG asks nothing of a rule that carries no meaning of its own,
   * so the bar here is only that it is there at all — and the value the paper was drawing it in, the light theme's
   * ground for a block, measured 1.13 to one against the page it was cutting.
   */
  test(`${name}: the rule can be told from the page it cuts`, () => {
    expect(contrastRatio(theme.rule, theme.background)).toBeGreaterThan(1.3);
  });

  test(`${name}: every colour it paints with is named in the palette`, () => {
    const named = new Set<Color>(Object.values(PALETTE));
    for (const [role, value] of Object.entries(theme)) {
      expect(named, role).toContain(value);
    }
  });
});
