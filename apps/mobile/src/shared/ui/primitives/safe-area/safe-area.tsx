import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export type SafeAreaRootProps = Readonly<{ children: ReactNode }>;

/** Provides the safe-area insets to the whole tree: the one place that reads react-native-safe-area-context. */
export function SafeAreaRoot({ children }: SafeAreaRootProps): ReactNode {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
