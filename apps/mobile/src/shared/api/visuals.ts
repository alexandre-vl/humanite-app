import { atSquare, atWidth } from '@huma/contracts';
import type { ArticleSummary, Picture } from '@huma/contracts';
import type { AssetWidth } from '@huma/mock-content/assets';
import { SOURCE } from './source';

/**
 * How wide a picture is wanted, named by the place it fills rather than by a count of pixels. A screen knows the box it
 * lays out, not the widths the corpus was written at, so it asks by role and this table answers — and the day the
 * pictures are written at other widths, only this table moves.
 *
 * The journal's pictures are asked for at these same widths. Its server scales down to whatever width it is asked and
 * never up — a picture listed at 1200 pixels comes back at 1200 when asked for 1600 — so the one table serves both
 * sources: a thumbnail is a thumbnail whichever of them drew it.
 *
 * It is published because it is one half of a pair: the corpus writes a file per width, this names the places, and
 * nothing but a test can hold the two against each other. A width written for no place is bundle a cold start pays
 * for and no screen can ever spend — what the last one weighed is written beside the corpus's widths.
 */
export const PLACE_WIDTHS = {
  thumbnail: 320,
  card: 1080,
  lead: 1600,
} as const satisfies Readonly<Record<string, AssetWidth>>;

/** The place a picture fills, from a row's thumbnail to the lead picture of an article. */
type PicturePlace = keyof typeof PLACE_WIDTHS;

/**
 * Which places are square, and so have a picture of the journal cut square by its server rather than scaled up to fill
 * them. A picture of the corpus is a file of the bundle, drawn at its width and cut by the view.
 */
const SQUARE = { thumbnail: true, card: false, lead: false } as const satisfies Readonly<Record<PicturePlace, boolean>>;

/**
 * A picture ready for a native view: the module the bundler resolved or the address the phone asks for, and — for a
 * picture of the corpus — the hash painted until it arrives. A picture of the journal has no hash to paint: the
 * service sends none, and the box keeps its ground colour until the picture lands.
 */
export type Visual = Readonly<{ source: number | Readonly<{ uri: string }>; thumbhash?: string }>;

/**
 * A picture for the place it fills. A key of the corpus is drawn by the source the build bundled, which gives `null`
 * for a key that names nothing — and for every key, in a build that reads the service and carries no corpus — rather
 * than a broken view. A picture of the journal is always an address, which its schema has already held to the
 * journal's own server; it is asked for at the width of the place it fills and not at the one the service listed.
 */
export const visualOf = (picture: Picture, place: PicturePlace): Visual | null => {
  if (picture.kind === 'journal') {
    const width = PLACE_WIDTHS[place];
    return { source: { uri: SQUARE[place] ? atSquare(picture.url, width) : atWidth(picture.url, width) } };
  }
  const drawn = SOURCE.corpusPicture(picture.key, PLACE_WIDTHS[place]);
  return drawn === null ? null : { source: drawn.module, thumbhash: drawn.thumbhash };
};

/**
 * The illustration an item carries, at the width of the place it fills, or nothing when it carries none. Whether it
 * carries one is asked of the item and never of its kind: the schema makes `hero` optional on every item, whatever it
 * is.
 *
 * It is asked here, beside the key resolver, because more than one entity asks it and no entity may ask another: a
 * card of the feed and the cover of a numéro both need the picture of an item, and the item is the content's shape,
 * which is what this door answers for.
 */
export const pictureOf = (summary: ArticleSummary, place: PicturePlace): Visual | null =>
  summary.hero === undefined ? null : visualOf(summary.hero.picture, place);
