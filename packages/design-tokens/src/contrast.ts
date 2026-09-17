import type { Color } from './brand.ts';

/** The linearised value of one 0–255 colour channel, per WCAG 2. */
const channel = (value: number): number => {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance of a `#rrggbb` colour, from 0 (black) to 1 (white). */
const luminance = (hex: Color): number => {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

/** WCAG 2 contrast ratio between a foreground and a background colour, from 1 to 21. */
export const contrastRatio = (foreground: Color, background: Color): number => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};
