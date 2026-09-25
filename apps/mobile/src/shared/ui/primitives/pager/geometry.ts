/**
 * The pure geometry of the band that names a pager’s pages, in points. Reanimated worklets call `spanAt` on the UI thread — hence the
 * `'worklet'` directive — while a jest test exercises it as a plain function on the JS thread.
 */

/** Where one name came to rest, in points, inside the row that holds them all. */
export type NamePlace = Readonly<{ x: number; width: number }>;

/** Nowhere, which is where a band stands before it has measured anything. */
const NOWHERE: NamePlace = { x: 0, width: 0 };

/**
 * Where the band stands at `at`, counted in places: the place itself at a whole number, and the ground between two
 * of them at anything in between — which is what a finger halfway through a turn is looking at.
 *
 * Past either end it holds still. A reader dragging against the first page or the last pulls the row a little further
 * than there is anything to show, and a rule that kept travelling would slide out from under the only name there is.
 */
export const spanAt = (places: readonly NamePlace[], at: number): NamePlace => {
  'worklet';
  if (places.length === 0) {
    return NOWHERE;
  }
  const last = places.length - 1;
  const low = Math.min(Math.max(Math.floor(at), 0), last);
  const high = Math.min(Math.max(Math.ceil(at), 0), last);
  const from = places[low] ?? NOWHERE;
  const to = places[high] ?? from;
  const part = low === high ? 0 : at - low;
  return { x: from.x + (to.x - from.x) * part, width: from.width + (to.width - from.width) * part };
};

/** How a rule laid out `laid` wide is carried and stretched to cover `span`, about its own middle. */
export type Travel = Readonly<{ translateX: number; scaleX: number }>;

/**
 * Where the rule goes and how far it is stretched to stand under `span`.
 *
 * Stretched and not resized: a width is a layout property, and one that changes puts the whole band through Yoga on
 * every frame. A transform touches no layout at all. It scales about the view's own middle, which is where React
 * Native puts the origin, so the carry aims the middle rather than the left edge.
 */
export const travelOf = (span: NamePlace, laid: number): Travel => {
  'worklet';
  return { translateX: span.x + span.width / 2 - laid / 2, scaleX: laid === 0 ? 0 : span.width / laid };
};

/**
 * How far along the band has to stand for `span` to be read as one of a row rather than as its start: `before` of the
 * row kept ahead of it, and never past the beginning, which has nothing before it to show.
 */
export const offsetOf = (span: NamePlace, before: number): number => {
  'worklet';
  return Math.max(0, span.x - before);
};
