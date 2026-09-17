import type { Color } from './brand.ts';
import { color } from './brand.ts';
import { PALETTE } from './palette.ts';

/** The semantic colour roles a screen paints with, one value per theme. */
export type Theme = Readonly<{
  background: Color;
  surface: Color;
  card: Color;
  textPrimary: Color;
  textMuted: Color;
  textInverse: Color;
  primary: Color;
  premium: Color;
  border: Color;
  systemBar: Color;
}>;

/** The light theme, built from the measured palette. */
export const LIGHT_THEME: Theme = {
  background: PALETTE.white,
  surface: PALETTE.white,
  card: PALETTE.cardGrey,
  textPrimary: PALETTE.aubergine,
  textMuted: PALETTE.dateGrey,
  textInverse: PALETTE.white,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.blueGrey,
  systemBar: PALETTE.systemBarRed,
};

/** The dark theme, derived from the measured dark background #141414. */
export const DARK_THEME: Theme = {
  background: PALETTE.darkBackground,
  surface: color('#1e1e1e'),
  card: color('#242424'),
  textPrimary: color('#f5f5f5'),
  textMuted: color('#b0a8b6'),
  textInverse: PALETTE.aubergine,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: color('#333333'),
  systemBar: PALETTE.darkBackground,
};

/** The themes by name. */
export const THEMES = { light: LIGHT_THEME, dark: DARK_THEME } as const satisfies Readonly<Record<string, Theme>>;
