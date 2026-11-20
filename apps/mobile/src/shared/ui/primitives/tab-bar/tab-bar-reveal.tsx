import type { ReactNode } from 'react';

/**
 * Brings a tucked-away tab bar back as soon as the reader pulls the page back up. Only iOS 26 and later tuck the bar
 * away at all, and only there does it need bringing back: everywhere else this draws nothing.
 */
export function TabBarReveal(): ReactNode {
  return null;
}
