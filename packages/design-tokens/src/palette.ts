import type { Color } from './brand.ts';
import { color } from './brand.ts';

/**
 * The palette measured on the current app (docs/app-actuelle/README.md, § Couleurs). Hex values are lower-cased; the
 * slider blue is off-charter but kept for the native control.
 */
export const PALETTE = {
  logoRed: color('#e30613'),
  uiRed: color('#f13c47'),
  aubergine: color('#230434'),
  buttonOrange: color('#f4ab3c'),
  premiumYellow: color('#ffd603'),
  blueGrey: color('#ecf2f2'),
  cardGrey: color('#f5f5f5'),
  darkBackground: color('#141414'),
  dateGrey: color('#918199'),
  systemBarRed: color('#c84742'),
  sliderBlue: color('#0075ff'),
  white: color('#ffffff'),
  black: color('#000000'),
} as const satisfies Readonly<Record<string, Color>>;
