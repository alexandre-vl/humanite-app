import type { ReactNode } from 'react';
import { View } from 'react-native';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';

export type SurfaceProps = Readonly<{ children?: ReactNode; style?: StyleRef }>;

const styles = createStyles({ surface: { flex: 1 } });

/** The ground a screen draws on, filling the space its parent gives it. */
export function Surface({ children, style }: SurfaceProps): ReactNode {
  return <View style={[styles.surface, style]}>{children}</View>;
}
