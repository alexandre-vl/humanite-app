import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { Color, Space } from '@huma/design-tokens';
import type { Announcement } from '../../../lib/announce';
import type { StyleRef } from '../../../lib/styles';

/** One semantic icon key mapped to its platform symbol: an SF Symbol on iOS, a Material Symbol on Android. */
type IconSymbol = Readonly<{ ios: SFSymbol; android: AndroidSymbol }>;

/**
 * The typed icon set: callers name a semantic key, never a raw platform symbol (the single source of icon names).
 *
 * The five destinations of the tab bar are held here beside the rest, though the bar draws them with the navigator's
 * own symbol element rather than with the Icon below: what an icon is called is the question this table answers, and
 * an answer that stopped at the callers who happen to use one primitive would not be a single source of anything.
 */
export const ICONS = {
  account: { ios: 'person', android: 'person' },
  // The way out of a screen that was pushed. The platforms draw it differently and mean the same thing: iOS points
  // back along the edge it slid in from, Android points at the screen underneath.
  back: { ios: 'chevron.left', android: 'arrow_back' },
  // The two states of one mark. iOS draws them as a pair, outline then solid. Android cannot: the font this library
  // ships is `MaterialSymbols_400Regular`, a static instance of Material Symbols at FILL 0, so every name in it is an
  // outline. Rendered from that file at 96 points, `bookmark`, `bookmark_border`, `turned_in` and `turned_in_not` all
  // ink 43 % of the same 56 × 73 box — one glyph under four names. The kept state is therefore said by the disc the
  // toggle fills behind the mark, not by the mark, which is Material's own answer for a toggle and the only one
  // available here. The pair is kept all the same, so iOS draws the fill it has.
  bookmark: { ios: 'bookmark', android: 'bookmark_border' },
  bookmarkKept: { ios: 'bookmark.fill', android: 'bookmark' },
  clear: { ios: 'xmark.circle.fill', android: 'cancel' },
  headline: { ios: 'house', android: 'home' },
  live: { ios: 'bolt', android: 'bolt' },
  // The mark a row carries when touching it opens another screen.
  next: { ios: 'chevron.right', android: 'chevron_right' },
  // The two states of a password field's eye: pressed on the open eye, the letters show; on the struck-out one, they
  // hide again. Each draws what pressing it leads to.
  reveal: { ios: 'eye', android: 'visibility' },
  conceal: { ios: 'eye.slash', android: 'visibility_off' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  // How the reader sets the paper's own type. The letters are the signifier on both platforms, not a cogwheel: what
  // lies behind it is the size, the faces and the light or the dark, and none of those is a setting of the machine.
  reading: { ios: 'textformat.size', android: 'format_size' },
  search: { ios: 'magnifyingglass', android: 'search' },
} as const satisfies Readonly<Record<string, IconSymbol>>;

/**
 * An icon's props: a semantic name from ICONS (an unknown name is a build error), sized and tinted by tokens, and what
 * it says to a reader listening rather than looking. A symbol is drawn and not written, so unless it announces itself
 * it announces nothing at all; the answer is required so that nothing is passed over by accident.
 */
export type IconProps = Readonly<{
  name: keyof typeof ICONS;
  announces: Announcement;
  size?: Space;
  tintColor?: Color;
  style?: StyleRef;
}>;
