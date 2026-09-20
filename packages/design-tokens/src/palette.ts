import type { Color } from './brand.ts';
import { color } from './brand.ts';

/**
 * Every colour a theme paints with, and the only place one is written: a theme maps roles onto this table and never
 * spells a value of its own, which a test of the themes holds. Most are measured on the current app
 * (docs/app-actuelle/README.md, § Couleurs); the `dark` family is derived from the measured dark background, the
 * current app having no dark mode to measure. Hex values are lower-cased. Names say what a colour is, not where it is
 * used, so one name can serve several roles.
 *
 * Four measured colours are not here: the logo's own red, the orange of a search button, the red of the system bars
 * and the blue of a browser slider. No theme paints with any of them — three name a control this app draws itself in
 * the paper's own colours, and the fourth names a fault the reference document reports. What the current app looks
 * like is recorded where it is measured; this table is what is painted.
 */
export const PALETTE = {
  uiRed: color('#f13c47'),
  aubergine: color('#230434'),
  premiumYellow: color('#ffd603'),
  blueGrey: color('#ecf2f2'),
  paleGrey: color('#f5f5f5'),
  darkBackground: color('#141414'),
  darkSurface: color('#1e1e1e'),
  darkCard: color('#242424'),
  darkMuted: color('#b0a8b6'),
  darkBorder: color('#333333'),
  dateGrey: color('#918199'),
  white: color('#ffffff'),
  black: color('#000000'),
} as const satisfies Readonly<Record<string, Color>>;
