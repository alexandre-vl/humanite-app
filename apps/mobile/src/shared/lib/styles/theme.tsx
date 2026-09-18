import { LIGHT_THEME } from '@huma/design-tokens';
import type { Theme } from '@huma/design-tokens';
import { createContext, use } from 'react';
import type { ReactNode } from 'react';

/** The theme a subtree paints with; light by default, so a tree without a provider still renders. */
const ThemeContext = createContext<Theme>(LIGHT_THEME);

/** Reads the theme in force: every style the app builds resolves its colours through it. */
export function useTheme(): Theme {
  return use(ThemeContext);
}

/** Puts a resolved theme on the context for its subtree; the caller chooses which theme a screen paints with. */
export function ThemeProvider({ theme, children }: Readonly<{ theme: Theme; children: ReactNode }>): ReactNode {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}
