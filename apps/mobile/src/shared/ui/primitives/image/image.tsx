import { Image as ExpoImage } from 'expo-image';
import type { ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import type { StyleRef } from '../../../lib/styles';

export type ImageProps = Readonly<{
  source: ImageSource | string | number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  style?: StyleRef;
}>;

/** A cached image; a BlurHash source renders immediately, so a lead photo never pops in from blank. */
export function Image({ source, contentFit = 'cover', style }: ImageProps): ReactNode {
  return <ExpoImage source={source} contentFit={contentFit} style={style} />;
}
