import { describe, expect, test } from 'vitest';
import { lightnessStep } from './contrast.ts';
import { contrastRatio, PALETTE, THEME_CHOICES, THEME_NAMES, THEMES } from './index.ts';
import type { Color, Theme } from './index.ts';

/** Every theme the tokens publish, read from the table instead of listed again beside it. */
const themes: readonly (readonly [string, Theme])[] = Object.entries(THEMES);

/** The grounds a rule is drawn across: the page between two cards, a card between two rows, a sheet between choices. */
const RULED = ['background', 'card', 'surface'] as const satisfies readonly (keyof Theme)[];

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

/** The paper's name is the one thing that does not change with the page it is printed on: the mark is the paper. */
test('the paper’s name is one red, whichever page it is printed on', () => {
  expect(THEMES.dark.mark).toBe(THEMES.light.mark);
  expect(THEMES.light.mark).toBe(PALETTE.uiRed);
});

/**
 * A rule is as much there on one page as on the other. The ratio below ranked the dark theme's rule above the light
 * one's, 1.56 to one on its page against 1.43, and it all but vanished: through a phone's glass it stood 4.5 steps of
 * lightness from a card, where the light rule stands 9.9 from its own at its faintest.
 */
test('the dark theme’s rule is nowhere fainter than the light theme’s at its faintest', () => {
  const faintest = (theme: Theme): number =>
    Math.min(...RULED.map((ground) => lightnessStep(theme.rule, theme[ground])));
  expect(faintest(THEMES.dark)).toBeGreaterThanOrEqual(faintest(THEMES.light));
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
   * so the bar here is only that it is there at all, on every ground it cuts. The paper drew its first rule in the grey
   * of an empty picture, 1.13 to one against the page it was cutting, and the rows of the account were ruled in it
   * later still, 1.04 to one against their card; the dark theme's rule stood at 1.28 on its card until it was asked.
   */
  test.each(RULED)(`${name}: the rule can be told from the %s it cuts`, (ground) => {
    expect(contrastRatio(theme.rule, theme[ground])).toBeGreaterThan(1.3);
  });

  /**
   * A thing on its way has to be seen, at the faintest of its breath too, which takes it to a little over half its
   * strength. Drawn in the grey of a card, the ghost of a search stood 1.3 steps from the page at its faintest, and a
   * reader waiting on the journal saw a blank screen (iPhone simulator, 25/09/2026). It stays under the rule, so what
   * is coming never draws harder than the lines the paper draws.
   */
  test(`${name}: a stand-in is seen on the page, and less than the rule`, () => {
    for (const ground of ['background', 'surface'] as const) {
      expect(lightnessStep(theme.standIn, theme[ground])).toBeGreaterThan(9);
    }
    expect(lightnessStep(theme.standIn, theme.background)).toBeLessThan(lightnessStep(theme.rule, theme.background));
  });

  test(`${name}: every colour it paints with is named in the palette`, () => {
    const named = new Set<Color>(Object.values(PALETTE));
    for (const [role, value] of Object.entries(theme)) {
      expect(named, role).toContain(value);
    }
  });
});
