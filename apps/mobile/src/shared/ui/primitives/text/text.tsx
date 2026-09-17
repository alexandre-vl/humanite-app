import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';

export type TextProps = Readonly<{ children: DisplayText }>;

export function Text({ children }: TextProps): ReactNode {
  return <NativeText>{children}</NativeText>;
}
