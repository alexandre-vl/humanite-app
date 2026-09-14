import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export type SurfaceProps = Readonly<{ children: ReactNode }>;

const styles = StyleSheet.create({ surface: { flex: 1 } });

/** The ground a screen draws on, filling the space its parent gives it. */
export function Surface({ children }: SurfaceProps): ReactNode {
  return <View style={styles.surface}>{children}</View>;
}
