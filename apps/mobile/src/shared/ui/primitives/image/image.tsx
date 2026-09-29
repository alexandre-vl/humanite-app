import { Image as ExpoImage } from 'expo-image';
import type { ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import type { Announcement } from '../../../lib/announce';
import { announcedAs } from '../../../lib/announce';
import type { StyleRef } from '../../../lib/styles';

export type ImageProps = Readonly<{
  source: ImageSource | number;
  recyclingKey: string;
  announces: Announcement;
  thumbhash?: string | undefined;
  /**
   * A smaller copy of this very picture, painted until the picture itself lands.
   *
   * It is the same photograph cut the same way, at a width the reader has already been shown somewhere else, so it is
   * on the phone and paints on the first frame. What the eye sees is a picture that sharpens, which is a picture
   * arriving; what it saw before was a grey box that became a photograph, which is a flash.
   */
  standingIn?: ImageSource | undefined;
  style?: StyleRef;
  onAspectRatio?: ((ratio: number) => void) | undefined;
}>;

/**
 * A cached image. A thumbhash is a few dozen characters that decode to a blurred version of the picture: given one, the
 * view paints the illustration's colours on its first frame and the picture replaces them without the layout moving.
 *
 * A `recyclingKey` names what the view currently shows. A virtualised list hands a cell's views to another item instead
 * of mounting new ones, so without it the previous item's picture — and its placeholder — stay on screen until the new
 * one decodes. It is required rather than optional because no type can tell whether an image sits in a recycled cell,
 * so the only way to make the question unskippable is to ask it every time.
 *
 * `source` is what the bundler resolved from a key, which is a number, or a source object — an address on the journal's
 * server, or the shape the catalogue's own sample uses to paint a placeholder with no picture behind it. A picture of
 * the journal comes with no thumbhash, which is why a caller may hand one over as absent.
 *
 * Every picture the paper lays out fills its box and is cropped to it, so the fit is written here rather than asked
 * for: the boxes are the paper's, one shape for each kind of picture, and a caller choosing between five fits would be
 * a caller deciding what the paper looks like from inside a card. The journal serves its pictures in more shapes than
 * the paper has boxes, and the crop is what lets two cards of one kind stand the same height.
 *
 * `announces` is what the picture says to a reader listening to the paper, and it is required for the same reason
 * `recyclingKey` is: no type can tell whether a picture repeats the words beside it or carries something they do not,
 * so the question is asked every time rather than answered by silence.
 */
/**
 * Asks the phone for a picture before any view of it has been mounted, and keeps quiet about how it goes.
 *
 * A picture is held by the address it was asked for, and the address carries the width: the small square a card in a
 * line draws and the full-width picture the article opens on are two entries of the cache, however much they are the
 * same photograph. So the article's own is not in hand when the reader touches the card — it is asked for when the
 * screen mounts, and it lands after the words, which is the flash. Measured on the journal's server on 24/09/2026:
 * 119 138 octets, 130 to 360 ms.
 *
 * Asked when the finger lands instead, it runs under the press, the lift and the screen sliding in — a few hundred
 * milliseconds that were being spent anyway.
 *
 * A picture the bundler resolved is a number rather than an address: it is already on the phone and there is nothing
 * to ask for. A failure is swallowed, because nobody has asked to see this yet.
 */
export const prefetchPicture = (source: ImageSource | number | null): void => {
  if (source === null || typeof source === 'number' || source.uri === undefined) {
    return;
  }
  void ExpoImage.prefetch(source.uri).catch(() => undefined);
};

/**
 * What the box holds until the picture itself is drawn: the hash a picture of the corpus carries, or the smaller copy
 * of this same picture the reader has already been shown.
 *
 * One or the other and never both. A hash decodes on the phone and is always there; a smaller copy is only there if
 * something has already fetched it, and it is nearer the picture than any hash, so where there is one it wins.
 */
const painted = (
  thumbhash: string | undefined,
  standingIn: ImageSource | undefined,
): ImageSource | Readonly<{ thumbhash: string }> | null => {
  if (standingIn !== undefined) {
    return standingIn;
  }
  return thumbhash === undefined ? null : { thumbhash };
};

export function Image({
  source,
  recyclingKey,
  announces,
  thumbhash,
  standingIn,
  style,
  onAspectRatio,
}: ImageProps): ReactNode {
  return (
    <ExpoImage
      source={source}
      recyclingKey={recyclingKey}
      placeholder={painted(thumbhash, standingIn)}
      // What stands in is this same picture, so it is cut to the box the same way the picture will be. Left to scale
      // down, it would sit small in the middle of the box and the photograph would jump out of it.
      placeholderContentFit="cover"
      // No transition, and that is measured rather than chosen. A cross-dissolve of 180 ms was drawn here to soften
      // the moment the picture takes over from what stood in: on the phone, on 24/09/2026, it emptied the box for one
      // frame between the two — picture at 2,25 s, the box's own grey at 2,30 s, picture again at 2,35 s. A blank of
      // 50 ms in the middle of a photograph already on screen is a flash the reader had not been shown before.
      // Without it the swap is invisible: two runs, no frame of the box's ground at all.
      onLoad={(event) => {
        if (event.source.width > 0 && event.source.height > 0) {
          onAspectRatio?.(event.source.width / event.source.height);
        }
      }}
      contentFit="cover"
      style={style}
      {...announcedAs(announces)}
    />
  );
}
