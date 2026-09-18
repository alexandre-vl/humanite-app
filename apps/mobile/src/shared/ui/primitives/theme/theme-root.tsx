import { DARK_THEME, LIGHT_THEME } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { ThemeProvider } from '../../../lib/styles';

/**
 * Resolves the device's colour scheme to a theme and provides it to the app: the only reader of the system scheme. It
 * also contrasts the status bar's icons with that theme, which an edge-to-edge window leaves to the app to set —
 * without it, light icons stay light and vanish on the light theme's background.
 */
export function ThemeRoot({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const dark = useColorScheme() === 'dark';
  return (
    <ThemeProvider theme={dark ? DARK_THEME : LIGHT_THEME}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeProvider>
  );
}
