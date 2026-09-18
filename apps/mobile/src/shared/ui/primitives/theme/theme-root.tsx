import { DARK_THEME, LIGHT_THEME } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from '../../../lib/styles';

/** Resolves the device's colour scheme to a theme and provides it to the app: the only reader of the system scheme. */
export function ThemeRoot({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const scheme = useColorScheme();
  return <ThemeProvider theme={scheme === 'dark' ? DARK_THEME : LIGHT_THEME}>{children}</ThemeProvider>;
}
