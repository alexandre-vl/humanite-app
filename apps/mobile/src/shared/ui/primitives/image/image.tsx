import { Image as ExpoImage } from 'expo-image';
import type { ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import type { StyleRef } from '../../../lib/styles';

export type ImageProps = Readonly<{
  source: ImageSource | number;
  recyclingKey: string;
  thumbhash?: string;
  style?: StyleRef;
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
 * `source` is what the bundler resolved from a key, which is a number, or a source object — the shape the catalogue's
 * own sample uses to paint a placeholder with no picture behind it.
 *
 * Every picture the paper lays out fills its box and is cropped to it, so the fit is written here rather than asked
 * for: the boxes are the paper's, the pictures are all written at one shape, and a caller choosing between five fits
 * would be a caller deciding what the paper looks like from inside a card.
 */
export function Image({ source, recyclingKey, thumbhash, style }: ImageProps): ReactNode {
  return (
    <ExpoImage
      source={source}
      recyclingKey={recyclingKey}
      placeholder={thumbhash === undefined ? null : { thumbhash }}
      contentFit="cover"
      style={style}
    />
  );
}
