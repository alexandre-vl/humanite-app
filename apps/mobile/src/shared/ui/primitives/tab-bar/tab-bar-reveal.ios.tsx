import { requireNativeView } from 'expo';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

/** No size and no touch: it holds nothing, it only has to be in the window beside the tabs. */
const Reveal = requireNativeView<Readonly<{ pointerEvents: 'none' }>>('HumaTabBar');

/** The iOS 26 bar minimises on scroll down and, left to itself, expands again only at the top of the page or on a tap. */
const TUCKS_AWAY = Number.parseInt(String(Platform.Version), 10) >= 26;

/**
 * Brings the tab bar back as soon as the reader pulls the page back up, rather than only once they are back at its
 * top: a view of no height, set beside the tabs, finds their controller and follows every drag inside it
 * (`modules/tab-bar`). Before iOS 26 the bar never leaves, and nothing is set at all.
 */
export function TabBarReveal(): ReactNode {
  return TUCKS_AWAY ? <Reveal pointerEvents="none" /> : null;
}
