import type { ReactNode } from 'react';
import { View } from 'react-native';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';

export type SurfaceProps = Readonly<{ children?: ReactNode; style?: StyleRef; onLayout?: () => void }>;

const useStyles = createStyles((theme) => ({ surface: { flex: 1, backgroundColor: theme.background } }));

/** The ground a screen draws on in the theme's background, filling the space its parent gives it. */
export function Surface({ children, style, onLayout }: SurfaceProps): ReactNode {
  const styles = useStyles();
  return (
    <View style={[styles.surface, style]} onLayout={onLayout}>
      {children}
    </View>
  );
}
