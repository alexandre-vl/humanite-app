import { THEMES } from '@huma/design-tokens';
import type { ThemeName } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from '../../../lib/styles';
import { BAR_STYLES } from './bar-style';

export type ThemeScopeProps = Readonly<{
  /** The theme the subtree is painted in, or none to keep the one it is already in. */
  name: ThemeName | null;
  /**
   * Whether the scope is a whole screen, status bar and all: its icons are then set against the scope's own ground, and
   * not left as the reader's theme set them — light icons vanish on a light page, dark ones on a dark page.
   */
  screen?: boolean | undefined;
  children: ReactNode;
}>;

/**
 * Paints a subtree in a named theme rather than the reader's. Some grounds belong to what is being read and not to a
 * setting: the current app lays a video article on the dark ground whatever the phone is set to, and lays a torn piece
 * of newsprint — a linked card — light again inside it.
 *
 * A scope may name no theme, and keeps the one it is in. That is what lets a screen that learns what it holds only once
 * its content arrives — a video's page is dark, an article's is not — stand in the same tree before and after: a
 * scope put around a screen that had none would build the whole screen again, content and all, to paint it.
 *
 * A subtree that names a theme keeps every rule the rest of the app follows: its styles still come from createStyles,
 * its texts still name a tone, and nothing inside it knows which theme it is in. Only the name travels.
 */
export function ThemeScope({ name, screen = false, children }: ThemeScopeProps): ReactNode {
  const enclosing = useTheme();
  return (
    <ThemeProvider theme={name === null ? enclosing : THEMES[name]}>
      {screen && name !== null ? <StatusBar barStyle={BAR_STYLES[name]} /> : null}
      {children}
    </ThemeProvider>
  );
}
