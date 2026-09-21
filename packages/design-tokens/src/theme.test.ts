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
 * What every colour of text owes the ground it is printed on is not here: it is derived from the size that text is
 * set in, by `legibility.ts` and the test beside it. What stayed here is what is not text — a control's own shape,
 * the two grounds of a feed telling each other apart, and the mark that builds itself in a light scope.
 */
describe.each(themes)('%s theme', (name, theme) => {
  /**
   * A control is not text: what has to be found is its own shape, and WCAG asks three to one of the parts that say
   * which state it is in. The switch of the settings screen is drawn from these roles — the ground is its knob, the
   * muted colour its track when off, the primary colour its track when on — after a version drawn from the border
   * and the surface measured 1.13 to 1 against the page on a real phone, on the screen a reader opens precisely
   * because they cannot see well. The muted colour is held against the grounds it is printed on by the legibility
   * rule, which reads the size it is set in; this is the other pair, and it is a shape rather than a word.
   */
  test(`${name}: a control drawn on the primary colour keeps its own shape`, () => {
    expect(contrastRatio(theme.background, theme.primary)).toBeGreaterThanOrEqual(3);
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
