import { Image as ExpoImage } from 'expo-image';
import type { ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import type { StyleRef } from '../../../lib/styles';

export type ImageProps = Readonly<{
  source: ImageSource | number;
  recyclingKey: string;
  thumbhash?: string;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
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
 */
export function Image({ source, recyclingKey, thumbhash, contentFit = 'cover', style }: ImageProps): ReactNode {
  return (
    <ExpoImage
      source={source}
      recyclingKey={recyclingKey}
      placeholder={thumbhash === undefined ? null : { thumbhash }}
      contentFit={contentFit}
      style={style}
    />
  );
}
