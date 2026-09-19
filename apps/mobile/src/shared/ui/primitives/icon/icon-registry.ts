import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { Color, Space } from '@huma/design-tokens';
import type { StyleRef } from '../../../lib/styles';

/** One semantic icon key mapped to its platform symbol: an SF Symbol on iOS, a Material Symbol on Android. */
type IconSymbol = Readonly<{ ios: SFSymbol; android: AndroidSymbol }>;

/**
 * The typed icon set: callers name a semantic key, never a raw platform symbol (the single source of icon names).
 *
 * The four destinations of the tab bar are held here beside the rest, though the bar draws them with the navigator's
 * own symbol element rather than with the Icon below: what an icon is called is the question this table answers, and
 * an answer that stopped at the callers who happen to use one primitive would not be a single source of anything.
 */
export const ICONS = {
  account: { ios: 'person', android: 'person' },
  bookmark: { ios: 'bookmark', android: 'bookmark' },
  headline: { ios: 'house', android: 'home' },
  live: { ios: 'bolt', android: 'bolt' },
  newsstand: { ios: 'newspaper', android: 'newspaper' },
  search: { ios: 'magnifyingglass', android: 'search' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share' },
} as const satisfies Readonly<Record<string, IconSymbol>>;

/** An icon's props: a semantic name from ICONS (an unknown name is a build error), sized and tinted by tokens. */
export type IconProps = Readonly<{ name: keyof typeof ICONS; size?: Space; tintColor?: Color; style?: StyleRef }>;
