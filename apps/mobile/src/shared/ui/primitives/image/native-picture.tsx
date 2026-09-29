import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import type { ImageProps } from './image';

export type NativePictureProps = Readonly<{
  source: ImageProps['source'];
  children: ReactNode;
  words: Readonly<{
    open: DisplayText;
    label: DisplayText;
    close: DisplayText;
    enlarge: DisplayText;
    reduce: DisplayText;
    showControls: DisplayText;
    hideControls: DisplayText;
    caption?: DisplayText | undefined;
    credit?: DisplayText | undefined;
  }>;
}>;

/** Android provides the native source and viewer; other platforms keep their page transition. */
export function NativePicture({ children }: NativePictureProps): ReactNode {
  return children;
}
