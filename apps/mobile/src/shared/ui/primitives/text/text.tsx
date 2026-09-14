import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';

export type TextProps = Readonly<{ children: string }>;

export function Text({ children }: TextProps): ReactNode {
  return <NativeText>{children}</NativeText>;
}
