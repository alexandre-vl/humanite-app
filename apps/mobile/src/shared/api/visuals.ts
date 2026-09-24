import { atWidth } from '@huma/contracts';
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
 *
 * There are two widths and not three, and that is the whole design. A picture is held in the cache by the address it
 * was asked for, so every width added is one more download of the same photograph; two widths mean a reader who has
 * seen a picture anywhere has it in hand everywhere. A card and a head fill the same box and ask the same address, so
 * the head paints off the disk. A row's thumbnail is the only other thing drawn, and it is what the head paints while
 * the full width is still coming.
 */
const FULL_WIDTH = 1080;

/**
 * The width a thumbnail is asked at.
 *
 * It is wide rather than square, and that costs 9 615 octets a row — 38 174 against 28 559, measured on the journal's
 * server on 24/09/2026. What it buys is that the thumbnail and the head are the same photograph cut the same way: laid
 * in the article's three-by-two box, a wide thumbnail shows x ∈ [84, 996] of a picture 1 080 across, and the full
 * width shows x ∈ [85, 995]. Cut square by the server, it showed x ∈ [236, 844] — a zoom into the middle, which
 * cannot stand in for the picture it is a crop of without visibly pulling back when the picture lands.
 *
 * It is 480 and not 320 because the box is drawn at 96 points, which is 264 pixels on a phone at 2.75× and more on a
 * denser one. A wide picture asked at 320 is 180 tall and would be drawn half as large again in that box; asked at
 * 480 it is 270 tall, which fills it at 0.98 and is the reason the square crop existed in the first place.
 */
const THUMBNAIL_WIDTH = 480;

export const PLACE_WIDTHS = {
  thumbnail: THUMBNAIL_WIDTH,
  card: FULL_WIDTH,
  lead: FULL_WIDTH,
} as const satisfies Readonly<Record<string, AssetWidth>>;

/** The place a picture fills, from a row's thumbnail to the lead picture of an article. */
type PicturePlace = keyof typeof PLACE_WIDTHS;

/**
 * A picture ready for a native view: the module the bundler resolved or the address the phone asks for, the hash
 * painted until it arrives for a picture of the corpus, and — for the head of an article — the smaller copy of itself
 * to paint meanwhile.
 *
 * A picture of the journal has no hash to paint: the service sends none. What it has instead is the thumbnail, which
 * the reader has already been shown and the phone therefore already holds.
 */
export type Visual = Readonly<{
  source: number | Readonly<{ uri: string }>;
  thumbhash?: string;
  standingIn?: Readonly<{ uri: string }>;
}>;

/**
 * A picture for the place it fills. A key of the corpus is drawn by the source the build bundled, which gives `null`
 * for a key that names nothing — and for every key, in a build that reads the service and carries no corpus — rather
 * than a broken view. A picture of the journal is always an address, which its schema has already held to the
 * journal's own server; it is asked for at the width of the place it fills and not at the one the service listed.
 *
 * The head of an article is handed the thumbnail's address as well as its own. A reader reaches an article by touching
 * a card, the card drew one of those two addresses, and whichever it drew is on the phone: the head paints it at once
 * and sharpens when the full width lands. Measured on this phone on 24/09/2026, that wait was a grey box for at least
 * 533 ms — tap at 1,20 s, picture at 1,90 s — on every article opened from a list.
 *
 * A picture of the corpus needs none of it: it is a file of the bundle, already on the phone, and it carries a hash.
 */
export const visualOf = (picture: Picture, place: PicturePlace): Visual | null => {
  if (picture.kind === 'journal') {
    const source = { uri: atWidth(picture.url, PLACE_WIDTHS[place]) };
    return place === 'lead' ? { source, standingIn: { uri: atWidth(picture.url, THUMBNAIL_WIDTH) } } : { source };
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
