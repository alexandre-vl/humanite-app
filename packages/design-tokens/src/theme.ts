import type { Color } from './brand.ts';
import { PALETTE } from './palette.ts';

/**
 * The semantic colour roles a screen paints with, one value per theme.
 *
 * `onPrimary` is the text a screen lays on `primary`: the wire of En continu paints its whole ground in it, and a
 * button its pill. Both themes give it the same value, because `primary` itself is the same red in both — a surface
 * that does not change between themes cannot ask for two different texts on it.
 *
 * `ground` is what a reading screen lays its sheet of `background` on, and `headline` the colour a headline takes
 * there. The dark article of the current app needs no rule of its own for either: its ground and its sheet are the
 * same value, so the sheet stops showing, and its headline turns white where the light one is red (captures 11, 13).
 *
 * `block` is the second ground a feed prints on, taken in turn with the page's own so a run of cards reads as one
 * block and the next as another (captures 18, 19). It is its own role because no other holds in both themes: the
 * reading screen's `ground` is the page itself once the theme is dark, and a grouped list's `card` is a shade the
 * light theme keeps for the settings it groups, and which measured 1.09 to 1 against the page: on a real screen, an
 * alternation nobody sees.
 */
export type Theme = Readonly<{
  background: Color;
  ground: Color;
  block: Color;
  surface: Color;
  card: Color;
  textPrimary: Color;
  textMuted: Color;
  onPrimary: Color;
  headline: Color;
  primary: Color;
  premium: Color;
  border: Color;
}>;

/** The light theme, built from the measured palette. */
export const LIGHT_THEME = {
  background: PALETTE.white,
  ground: PALETTE.blueGrey,
  block: PALETTE.blueGrey,
  surface: PALETTE.white,
  card: PALETTE.paleGrey,
  textPrimary: PALETTE.aubergine,
  textMuted: PALETTE.dateGrey,
  onPrimary: PALETTE.white,
  headline: PALETTE.uiRed,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.blueGrey,
} as const satisfies Theme;

/** The dark theme, derived from the measured dark background #141414. */
export const DARK_THEME = {
  background: PALETTE.darkBackground,
  ground: PALETTE.darkBackground,
  block: PALETTE.darkCard,
  surface: PALETTE.darkSurface,
  card: PALETTE.darkCard,
  textPrimary: PALETTE.paleGrey,
  textMuted: PALETTE.darkMuted,
  onPrimary: PALETTE.white,
  headline: PALETTE.white,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.darkBorder,
} as const satisfies Theme;

/**
 * The themes the paper publishes, named once.
 *
 * The list comes before the table rather than out of it: `Object.keys` answers with plain strings, and the one cast
 * that would narrow them back is the cast this repository forbids. Written this way, the `satisfies` below refuses a
 * name without a theme and a theme without a name, and the reader's choices below are built from the same list.
 */
export const THEME_NAMES = ['light', 'dark'] as const;

/** The name of a theme. */
export type ThemeName = (typeof THEME_NAMES)[number];

/** The themes by name. */
export const THEMES = { light: LIGHT_THEME, dark: DARK_THEME } as const satisfies Readonly<Record<ThemeName, Theme>>;

/**
 * What a reader may set the paper's colours to: either theme by name, or whichever the phone is in.
 *
 * `system` is not a third theme but the absence of a choice, which is why it is named here beside the others rather
 * than added to them: a table of themes answers with colours, and this answers which of them to ask for.
 */
export const THEME_CHOICES = ['system', ...THEME_NAMES] as const;

/** The name of a theme choice. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];
