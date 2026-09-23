import type { ThemeName } from '@huma/design-tokens';
import type { StatusBarStyle } from 'react-native';

/**
 * The icons the status bar draws over each theme: dark over the light page and light over the dark one, each vanishing
 * on the ground of its own colour. Written once for the root and for a scope that paints a whole screen, so the two
 * cannot set the bar differently over the same theme, and a theme added to the tokens is refused here until it has one.
 */
export const BAR_STYLES = {
  light: 'dark-content',
  dark: 'light-content',
} as const satisfies Readonly<Record<ThemeName, StatusBarStyle>>;
