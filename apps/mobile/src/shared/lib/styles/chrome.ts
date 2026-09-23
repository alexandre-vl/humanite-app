import type { Color, TextTone, Theme } from '@huma/design-tokens';

/**
 * What a surface the platform draws itself lets the app decide.
 *
 * A native tab bar and a native header lay their own letters and their own slab out: neither takes the style table
 * `createStyles` builds, and neither can be reached by a token. The colours are the one thing they hand back, and a
 * colour is a theme's to give — so every one of them is named here, and none is written at the navigator. Written
 * there, it would be a second place where the palette is decided, and the one place no rule about tokens can see.
 */

/**
 * The colour a word the platform draws is set in. It is read from a tone of text and from nothing else, so the only
 * colours a bar can print its words in are the ones the legibility rule of the tokens holds against their ground.
 */
const textColor = (tone: TextTone, theme: Theme): Color => theme[tone];

/** What a native tab bar is told: the ground it lays, the ink of its symbols and words, and the colours of a touch. */
type TabBarColors = Readonly<{
  backgroundColor: Color;
  tintColor: Color;
  iconColor: Color;
  indicatorColor: Color;
  rippleColor: Color;
  labelStyle: Readonly<{ color: Color }>;
}>;

/**
 * The colours the native tab bar is handed, in the colours in force.
 *
 * The tab a reader is on is named in `link`, the red a letter is read in, and no longer in the paper's own: a word of
 * the bar is small print, owed four and a half to one, and the red measured 3.83 on the light bar and 4.35 on the dark
 * one. Every other tab is named in the muted ink the paper sets its small print in. The pill Material lays behind the
 * tab one is on stays in `card`, which the bar barely shows — the red of its symbol and of its word says which tab it is.
 */
export const tabBarColors = (theme: Theme): TabBarColors => ({
  backgroundColor: theme.surface,
  tintColor: textColor('link', theme),
  iconColor: textColor('textMuted', theme),
  indicatorColor: theme.card,
  rippleColor: theme.border,
  labelStyle: { color: textColor('textMuted', theme) },
});

/** What a native stack is told: that it draws no bar of its own, and the ground it shows between two screens. */
type ChromeOptions = Readonly<{
  headerShown: false;
  contentStyle: Readonly<{ backgroundColor: Color }>;
}>;

/**
 * The options a native stack is handed, in the colours in force.
 *
 * The stack draws no header. One was drawn for a while, and it cost the app both a measurement and a design: the
 * platform pads its toolbar from the window's decor view whatever the app has already inset above it, so every
 * pushed screen opened on an empty band the height of the status bar; and a bar the platform lays out takes no
 * token, so the paper could neither centre its own name in one nor hang more than a single control off it. The bar
 * is the app's own now — `TopBar` — and it is the same bar on every screen.
 *
 * The ground behind a screen is still the stack's to paint: what shows between two screens belongs to the stack,
 * not to the screen, so a paper printed dark never slides out from under the system's white.
 */
export const chromeOptions = (theme: Theme): ChromeOptions => ({
  headerShown: false,
  contentStyle: { backgroundColor: theme.background },
});
