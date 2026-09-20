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
 */
export type Theme = Readonly<{
  background: Color;
  ground: Color;
  surface: Color;
  card: Color;
  textPrimary: Color;
  textMuted: Color;
  onPrimary: Color;
  headline: Color;
  primary: Color;
  premium: Color;
  border: Color;
  systemBar: Color;
}>;

/** The light theme, built from the measured palette. */
export const LIGHT_THEME = {
  background: PALETTE.white,
  ground: PALETTE.blueGrey,
  surface: PALETTE.white,
  card: PALETTE.paleGrey,
  textPrimary: PALETTE.aubergine,
  textMuted: PALETTE.dateGrey,
  onPrimary: PALETTE.white,
  headline: PALETTE.uiRed,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.blueGrey,
  systemBar: PALETTE.systemBarRed,
} as const satisfies Theme;

/** The dark theme, derived from the measured dark background #141414. */
export const DARK_THEME = {
  background: PALETTE.darkBackground,
  ground: PALETTE.darkBackground,
  surface: PALETTE.darkSurface,
  card: PALETTE.darkCard,
  textPrimary: PALETTE.paleGrey,
  textMuted: PALETTE.darkMuted,
  onPrimary: PALETTE.white,
  headline: PALETTE.white,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.darkBorder,
  systemBar: PALETTE.darkBackground,
} as const satisfies Theme;

/** The themes by name. */
export const THEMES = { light: LIGHT_THEME, dark: DARK_THEME } as const satisfies Readonly<Record<string, Theme>>;

/**
 * What a reader may set the paper's colours to: either theme by name, or whichever the phone is in.
 *
 * `system` is not a third theme but the absence of a choice, which is why it is named here beside the two rather than
 * added to them: a table of themes answers with colours, and this answers which of them to ask for.
 */
export const THEME_CHOICES = ['system', 'light', 'dark'] as const;

/** The name of a theme choice. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];
