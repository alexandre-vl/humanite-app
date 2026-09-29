import { requireNativeView } from 'expo';
import type { ReactNode } from 'react';
import { Image as SystemImage } from 'react-native';
import type { NativePictureProps } from './native-picture';

const PictureSource = requireNativeView<
  Readonly<{
    uri: string;
    headers: Record<string, string>;
    words: Readonly<Record<string, string>>;
    accessibilityLabel: string;
    accessible: boolean;
    children: ReactNode;
  }>
>('HumaPicture');

export function NativePicture({ source, words, children }: NativePictureProps): ReactNode {
  const resolved = typeof source === 'number' ? SystemImage.resolveAssetSource(source) : source;
  return (
    <PictureSource
      uri={resolved.uri ?? ''}
      headers={'headers' in resolved ? (resolved.headers ?? {}) : {}}
      words={{ ...words, caption: words.caption ?? '', credit: words.credit ?? '' }}
      accessible
      accessibilityLabel={words.open}
    >
      {children}
    </PictureSource>
  );
}
