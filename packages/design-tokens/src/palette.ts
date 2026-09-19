import type { Color } from './brand.ts';
import { color } from './brand.ts';

/**
 * Every colour a theme paints with, and the only place one is written: a theme maps roles onto this table and never
 * spells a value of its own, which a test of the themes holds. Most are measured on the current app
 * (docs/app-actuelle/README.md, § Couleurs); the `dark` family is derived from the measured dark background, the
 * current app having no dark mode to measure. Hex values are lower-cased; the slider blue is off-charter but kept
 * for the native control. Names say what a colour is, not where it is used, so one name can serve several roles.
 */
export const PALETTE = {
  logoRed: color('#e30613'),
  uiRed: color('#f13c47'),
  aubergine: color('#230434'),
  buttonOrange: color('#f4ab3c'),
  premiumYellow: color('#ffd603'),
  blueGrey: color('#ecf2f2'),
  paleGrey: color('#f5f5f5'),
  darkBackground: color('#141414'),
  darkSurface: color('#1e1e1e'),
  darkCard: color('#242424'),
  darkMuted: color('#b0a8b6'),
  darkBorder: color('#333333'),
  dateGrey: color('#918199'),
  systemBarRed: color('#c84742'),
  sliderBlue: color('#0075ff'),
  white: color('#ffffff'),
  black: color('#000000'),
} as const satisfies Readonly<Record<string, Color>>;
