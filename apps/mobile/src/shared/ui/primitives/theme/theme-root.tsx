import { THEMES } from '@huma/design-tokens';
import type { ThemeChoice, ThemeName } from '@huma/design-tokens';
import { setBackgroundColorAsync } from 'expo-system-ui';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { ColorSchemeName } from 'react-native';
import { StatusBar, useColorScheme } from 'react-native';
import { ThemeProvider } from '../../../lib/styles';
import { BAR_STYLES } from './bar-style';

export type ThemeRootProps = Readonly<{ choice: ThemeChoice; children: ReactNode }>;

/**
 * The theme a choice names: itself when it names one, and otherwise the phone's — dark when the phone says dark, and
 * the light page when it says light or nothing at all, which is the paper as it is printed.
 */
const themeFor = (choice: ThemeChoice, scheme: ColorSchemeName): ThemeName => {
  if (choice !== 'system') {
    return choice;
  }
  return scheme === 'dark' ? 'dark' : 'light';
};

/**
 * Resolves a choice to a theme and provides it to the app: the only reader of the system scheme. It also contrasts the
 * status bar's icons with that theme, which an edge-to-edge window leaves to the app to set — without it, light icons
 * stay light and vanish on the light theme's background.
 *
 * It paints the window itself in the same colour. Every screen lays a ground of its own, but the window shows through
 * wherever none has been laid yet or none reaches: behind the transparent system bars of an edge-to-edge window, and
 * for the moment between the splash going and the first screen arriving. Left at the white the native project is built
 * with, that is a white frame around a paper printed dark — which is the very fault the reference document reports of
 * the current app's system bars, in the other direction.
 *
 * The choice comes down as a prop rather than being read here, because where the reader's settings are kept is not a
 * primitive's to know: this one is handed which theme to paint in, exactly as the scope that names one for a subtree.
 * The system's scheme is still read on every render, since a reader who has chosen neither theme follows the phone,
 * and a phone that turns dark under them must be seen to.
 */
export function ThemeRoot({ choice, children }: ThemeRootProps): ReactNode {
  const name = themeFor(choice, useColorScheme());
  const theme = THEMES[name];
  useEffect(() => {
    void setBackgroundColorAsync(theme.background);
  }, [theme.background]);
  return (
    <ThemeProvider theme={theme}>
      <StatusBar barStyle={BAR_STYLES[name]} />
      {children}
    </ThemeProvider>
  );
}
