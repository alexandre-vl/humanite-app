import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type TextProps = Readonly<{ children: DisplayText; style?: StyleRef }>;

export function Text({ children, style }: TextProps): ReactNode {
  return <NativeText style={style}>{children}</NativeText>;
}
