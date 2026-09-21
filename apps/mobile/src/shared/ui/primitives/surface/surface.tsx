import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFirstLayoutSignal } from '../../../lib/startup';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';

export type SurfaceProps = Readonly<{ children?: ReactNode; style?: StyleRef }>;

const useStyles = createStyles((theme) => ({ surface: { flex: 1, backgroundColor: theme.background } }));

/**
 * The ground a screen draws on in the theme's background, filling the space its parent gives it and holding what it
 * holds clear of the status bar.
 *
 * The inset is paid here, by the ground, rather than once above the whole stack. Paid above, it was paid twice on
 * every pushed screen — the native header pads itself from the window's decor view regardless — and it was paid in
 * the one colour the root frame happened to carry, so a screen printed red met a white strip under the clock. Paid
 * here it is paid once, in the screen's own colour, and a screen that wants its ink to reach the top of the glass
 * has only to say what colour its ground is. It is a device measurement and not a token, which is why it reaches the
 * view beside the style table rather than inside it.
 *
 * It reports its own first layout, which is what lifts the splash. The report belongs here rather than in a screen
 * because every screen draws on exactly one ground — the error screen included — so the app can open on any route,
 * or fail to render one, without leaving the splash up for ever waiting on a screen nobody opened.
 */
export function Surface({ children, style }: SurfaceProps): ReactNode {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const signalFirstLayout = useFirstLayoutSignal();
  const clear = { paddingTop: insets.top };
  return (
    <View style={[styles.surface, style, clear]} onLayout={signalFirstLayout}>
      {children}
    </View>
  );
}
