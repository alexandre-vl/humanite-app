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

/**
 * What a screen's glass lays over every colour it shows: the light of the room it reflects, which WCAG 2 counts as
 * five parts in a hundred of white — the 0.05 on both sides of the ratio above.
 */
const FLARE = 0.05;

/**
 * The lightness of a colour as the eye reads it through that glass: CIE L*, the scale on which equal steps look equal
 * (CIE 15), from 0 to 100, of the luminance with the flare laid over it. The flare keeps every luminance in the part of
 * the scale that goes as a cube root, the only part written here.
 */
const seenLightness = (hex: Color): number => 116 * Math.cbrt((luminance(hex) + FLARE) / (1 + FLARE)) - 16;

/**
 * How far apart two colours look through a screen's glass, in steps of lightness.
 *
 * It says what the ratio cannot: two dark colours lose most of their step to the flare, and two light ones almost
 * none. The dark theme's rule measured 1.56 to one against its page by the ratio, above the light theme's 1.43, and all
 * but vanished on the iPhone simulator on 25/09/2026. Seen this way it stood 7.0 steps from that page, and the light
 * rule 13.2 from its own.
 */
export const lightnessStep = (one: Color, other: Color): number => Math.abs(seenLightness(one) - seenLightness(other));
