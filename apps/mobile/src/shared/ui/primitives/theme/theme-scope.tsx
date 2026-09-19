import { THEMES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../../lib/styles';

/** The name of a theme the app publishes. */
export type ThemeName = keyof typeof THEMES;

export type ThemeScopeProps = Readonly<{ name: ThemeName; children: ReactNode }>;

/**
 * Paints a subtree in a named theme rather than the reader's. Some grounds belong to what is being read and not to a
 * setting: the current app lays a video article on the dark ground whatever the phone is set to, and lays a torn piece
 * of newsprint — a linked card, a callout — light again inside it.
 *
 * A subtree that names a theme keeps every rule the rest of the app follows: its styles still come from createStyles,
 * its texts still name a tone, and nothing inside it knows which theme it is in. Only the name travels.
 */
export function ThemeScope({ name, children }: ThemeScopeProps): ReactNode {
  return <ThemeProvider theme={THEMES[name]}>{children}</ThemeProvider>;
}
