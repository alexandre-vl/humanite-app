import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type BoxProps = Readonly<{ children?: ReactNode; style?: StyleRef }>;

/** A plain view laid out by a StyleRef: the neutral container primitives and components compose. */
export function Box({ children, style }: BoxProps): ReactNode {
  return <View style={style}>{children}</View>;
}
