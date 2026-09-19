import { Image as ExpoImage } from 'expo-image';
import type { ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import type { StyleRef } from '../../../lib/styles';

export type ImageProps = Readonly<{
  source: ImageSource | number;
  thumbhash?: string;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  style?: StyleRef;
}>;

/**
 * A cached image. A thumbhash is a few dozen characters that decode to a blurred version of the picture: given one, the
 * view paints the illustration's colours on its first frame and the picture replaces them without the layout moving.
 */
export function Image({ source, thumbhash, contentFit = 'cover', style }: ImageProps): ReactNode {
  return (
    <ExpoImage
      source={source}
      placeholder={thumbhash === undefined ? null : { thumbhash }}
      contentFit={contentFit}
      style={style}
    />
  );
}
