import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type BoxProps = Readonly<{ children?: ReactNode; style?: StyleRef }>;

/**
 * A plain view laid out by a StyleRef: the neutral container primitives and components compose.
 *
 * It carries nothing for a screen reader, and does not need to: every group the paper lays out that reads as one
 * thing is already inside a `Pressable`, which gathers what is under it and announces it once. A grouping axis here
 * would be an axis with no caller — and this repository has just finished removing the last of those.
 */
export function Box({ children, style }: BoxProps): ReactNode {
  return <View style={style}>{children}</View>;
}
