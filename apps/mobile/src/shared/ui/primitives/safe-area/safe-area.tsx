import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export type SafeAreaRootProps = Readonly<{ children: ReactNode }>;

/**
 * Measures the window and offers what the system bars cover to whoever draws under them.
 *
 * It holds the measurement and nothing else. It used to pay the top inset itself, for the whole stack at once, and
 * that was a second payment: a pushed screen also carried a native header, and `react-native-screens` pads that
 * header from the window's own decor view whatever the app has already done above it
 * (`CustomToolbar.kt`, `shouldApplyTopInset` hard-coded true since SDK 35). A tab root paid the inset once and a
 * pushed screen paid it twice, which is the empty band the reader saw at the top of every sub-screen.
 *
 * The app draws its own bar now, so the inset is paid once, by the ground each screen draws on — which is also what
 * lets a screen printed red run its colour up behind the clock instead of leaving a white strip over it.
 */
export function SafeAreaRoot({ children }: SafeAreaRootProps): ReactNode {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
