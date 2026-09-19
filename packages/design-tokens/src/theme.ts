import type { Color } from './brand.ts';
import { PALETTE } from './palette.ts';

/**
 * The semantic colour roles a screen paints with, one value per theme.
 *
 * `onPrimary` is the text a screen lays on `primary`: the wire of En continu paints its whole ground in it, and a
 * button its pill. Both themes give it the same value, because `primary` itself is the same red in both — a surface
 * that does not change between themes cannot ask for two different texts on it.
 */
export type Theme = Readonly<{
  background: Color;
  surface: Color;
  card: Color;
  textPrimary: Color;
  textMuted: Color;
  onPrimary: Color;
  primary: Color;
  premium: Color;
  border: Color;
  systemBar: Color;
}>;

/** The light theme, built from the measured palette. */
export const LIGHT_THEME = {
  background: PALETTE.white,
  surface: PALETTE.white,
  card: PALETTE.paleGrey,
  textPrimary: PALETTE.aubergine,
  textMuted: PALETTE.dateGrey,
  onPrimary: PALETTE.white,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.blueGrey,
  systemBar: PALETTE.systemBarRed,
} as const satisfies Theme;

/** The dark theme, derived from the measured dark background #141414. */
export const DARK_THEME = {
  background: PALETTE.darkBackground,
  surface: PALETTE.darkSurface,
  card: PALETTE.darkCard,
  textPrimary: PALETTE.paleGrey,
  textMuted: PALETTE.darkMuted,
  onPrimary: PALETTE.white,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.darkBorder,
  systemBar: PALETTE.darkBackground,
} as const satisfies Theme;

/** The themes by name. */
export const THEMES = { light: LIGHT_THEME, dark: DARK_THEME } as const satisfies Readonly<Record<string, Theme>>;
