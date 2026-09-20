import type { Color, TextTone, Theme } from '@huma/design-tokens';

/**
 * What a surface the platform draws itself lets the app decide.
 *
 * A native tab bar and a native header lay their own letters and their own slab out: neither takes the style table
 * `createStyles` builds, and neither can be reached by a token. The colours are the one thing they hand back, and a
 * colour is a theme's to give — so every one of them is named here, and none is written at the navigator. Written
 * there, it would be a second place where the palette is decided, and the one place no rule about tokens can see.
 */

/** The colour a piece of text the platform draws is set in — a label under a tab bar, a title in a native header. */
export const chromeStyle = (tone: TextTone, theme: Theme): Readonly<{ color: Color }> => ({ color: theme[tone] });

/** The colours a native stack paints its chrome with: a header's slab and letters, and the ground between two screens. */
type ChromeOptions = Readonly<{
  headerStyle: Readonly<{ backgroundColor: Color }>;
  headerTintColor: Color;
  contentStyle: Readonly<{ backgroundColor: Color }>;
}>;

/**
 * The options a native stack is handed, in the colours in force. The ground behind a screen is given for the same
 * reason as the header's: what shows between two screens belongs to the stack, not to the screen, so a paper printed
 * dark never slides out from under the system's white.
 */
export const chromeOptions = (theme: Theme): ChromeOptions => ({
  headerStyle: { backgroundColor: theme.background },
  headerTintColor: theme.textPrimary,
  contentStyle: { backgroundColor: theme.background },
});
