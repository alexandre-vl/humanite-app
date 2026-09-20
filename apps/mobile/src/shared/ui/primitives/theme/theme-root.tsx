import { DARK_THEME, LIGHT_THEME } from '@huma/design-tokens';
import type { ThemeChoice } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { ThemeProvider } from '../../../lib/styles';

export type ThemeRootProps = Readonly<{ choice: ThemeChoice; children: ReactNode }>;

/**
 * Resolves a choice to a theme and provides it to the app: the only reader of the system scheme. It also contrasts the
 * status bar's icons with that theme, which an edge-to-edge window leaves to the app to set — without it, light icons
 * stay light and vanish on the light theme's background.
 *
 * The choice comes down as a prop rather than being read here, because where the reader's settings are kept is not a
 * primitive's to know: this one is handed which theme to paint in, exactly as the scope that names one for a subtree.
 * The system's scheme is still read on every render, since a reader who has chosen neither theme follows the phone,
 * and a phone that turns dark under them must be seen to.
 */
export function ThemeRoot({ choice, children }: ThemeRootProps): ReactNode {
  const scheme = useColorScheme();
  const dark = choice === 'system' ? scheme === 'dark' : choice === 'dark';
  return (
    <ThemeProvider theme={dark ? DARK_THEME : LIGHT_THEME}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeProvider>
  );
}
