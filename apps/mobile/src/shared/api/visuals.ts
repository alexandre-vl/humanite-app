import type { ArticleSummary, ImageKey } from '@huma/contracts';
import { VISUALS } from '@huma/mock-content';
import { ASSETS } from '@huma/mock-content/assets';
import type { AssetWidth } from '@huma/mock-content/assets';

/**
 * How wide a picture is wanted, named by the place it fills rather than by a count of pixels. A screen knows the box it
 * lays out, not the widths the corpus was written at, so it asks by role and this table answers — and the day the
 * pictures are written at other widths, only this table moves.
 *
 * It is published because it is one half of a pair: the corpus writes a file per width, this names the places, and
 * nothing but a test can hold the two against each other. A width written for no place is 63 files of bundle a cold
 * start pays for and no screen can ever spend.
 */
export const PLACE_WIDTHS = {
  thumbnail: 320,
  card: 1080,
  lead: 1600,
} as const satisfies Readonly<Record<string, AssetWidth>>;

/** The place a picture fills, from a row's thumbnail to the lead picture of an article. */
export type VisualSize = keyof typeof PLACE_WIDTHS;

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
  return { source: widths[PLACE_WIDTHS[size]], thumbhash };
};

/**
 * The illustration an item carries at the size asked for, or nothing: a brief and a column are written without one.
 * The corpus holds no brief with a picture today, but nothing in the contracts forbids one — the schema makes `hero`
 * optional on every item, and the corpus rule only stops requiring it of a brief — so the question is asked of the
 * item, never of its kind.
 *
 * It is asked here, beside the key resolver, because more than one entity asks it and no entity may ask another: a
 * card of the feed and the cover of a numéro both need the picture of an item, and the item is the content's shape,
 * which is what this door answers for.
 */
export const pictureOf = (summary: ArticleSummary, size: VisualSize): Visual | null =>
  summary.hero === undefined ? null : visualOf(summary.hero.key, size);
