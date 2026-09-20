import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { Color, Space } from '@huma/design-tokens';
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
  // The two states of one mark, outline then solid. The platforms name them the other way round from each other: an
  // `ios` bookmark is the outline and Material's is the solid one, so the pair is spelt out rather than guessed.
  bookmark: { ios: 'bookmark', android: 'bookmark_border' },
  bookmarkKept: { ios: 'bookmark.fill', android: 'bookmark' },
  clear: { ios: 'xmark.circle.fill', android: 'cancel' },
  headline: { ios: 'house', android: 'home' },
  live: { ios: 'bolt', android: 'bolt' },
  // The mark a row carries when touching it opens another screen.
  next: { ios: 'chevron.right', android: 'chevron_right' },
  newsstand: { ios: 'newspaper', android: 'newspaper' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  search: { ios: 'magnifyingglass', android: 'search' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share' },
} as const satisfies Readonly<Record<string, IconSymbol>>;

/** An icon's props: a semantic name from ICONS (an unknown name is a build error), sized and tinted by tokens. */
export type IconProps = Readonly<{ name: keyof typeof ICONS; size?: Space; tintColor?: Color; style?: StyleRef }>;
