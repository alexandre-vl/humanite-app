import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/styles';

export type SafeAreaRootProps = Readonly<{ children: ReactNode }>;

/**
 * Holds every screen clear of the status bar and paints the theme's ground behind it. An edge-to-edge window draws
 * under the system bars, so the inset is the app's to apply; it is a device measurement, not a token, which is why it
 * reaches the view outside a style.
 */
function SafeAreaFrame({ children }: SafeAreaRootProps): ReactNode {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const frame = { flex: 1, paddingTop: insets.top, backgroundColor: theme.background };
  return <View style={frame}>{children}</View>;
}

/** Provides the safe-area insets to the whole tree: the one place that reads react-native-safe-area-context. */
export function SafeAreaRoot({ children }: SafeAreaRootProps): ReactNode {
  return (
    <SafeAreaProvider>
      <SafeAreaFrame>{children}</SafeAreaFrame>
    </SafeAreaProvider>
  );
}
