import type { ImageKey } from '@huma/contracts';
import { VISUALS } from '@huma/mock-content';
import { ASSETS } from '@huma/mock-content/assets';
import type { AssetWidth } from '@huma/mock-content/assets';

/**
 * How wide a picture is wanted, named by the place it fills rather than by a count of pixels. A screen knows the box it
 * lays out, not the widths the corpus was written at, so it asks by role and this table answers — and the day the
 * pictures are written at other widths, only this table moves.
 */
const WIDTHS = {
  thumbnail: 320,
  card: 1080,
  lead: 1600,
} as const satisfies Readonly<Record<string, AssetWidth>>;

/** The place a picture fills, from a row's thumbnail to the lead picture of an article. */
export type VisualSize = keyof typeof WIDTHS;

/** A picture ready for a native view: what the bundler resolved, and the hash painted until it arrives. */
export type Visual = Readonly<{ source: number; thumbhash: string }>;

/**
 * The picture a key names, at the size asked for. A key that names nothing gives `null` rather than a broken view: the
 * corpus generator guarantees a file per key, and a screen that outlives that guarantee should show its text alone.
 */
export const visualOf = (key: ImageKey, size: VisualSize): Visual | null => {
  const widths = ASSETS[key];
  const thumbhash = VISUALS[key];
  if (widths === undefined || thumbhash === undefined) {
    return null;
  }
  return { source: widths[WIDTHS[size]], thumbhash };
};
