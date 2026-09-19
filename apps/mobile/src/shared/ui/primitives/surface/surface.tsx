import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useFirstLayoutSignal } from '../../../lib/startup';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';

export type SurfaceProps = Readonly<{ children?: ReactNode; style?: StyleRef }>;

const useStyles = createStyles((theme) => ({ surface: { flex: 1, backgroundColor: theme.background } }));

/**
 * The ground a screen draws on in the theme's background, filling the space its parent gives it.
 *
 * It reports its own first layout, which is what lifts the splash. The report belongs here rather than in a screen
 * because every screen draws on exactly one ground — the error screen included — so the app can open on any route,
 * or fail to render one, without leaving the splash up for ever waiting on a screen nobody opened.
 */
export function Surface({ children, style }: SurfaceProps): ReactNode {
  const styles = useStyles();
  const signalFirstLayout = useFirstLayoutSignal();
  return (
    <View style={[styles.surface, style]} onLayout={signalFirstLayout}>
      {children}
    </View>
  );
}
