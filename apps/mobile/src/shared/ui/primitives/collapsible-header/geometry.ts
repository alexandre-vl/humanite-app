/**
 * The pure geometry of the collapsing header, in points. Reanimated worklets call `collapseProgress` and `lerp` on the UI
 * thread — hence the `'worklet'` directive — while a jest test exercises them as plain functions on the JS thread.
 */

/** The scroll distance over which the header collapses: its expanded height less its collapsed height, never negative. */
export const collapseDistance = (expanded: number, collapsed: number): number => Math.max(expanded - collapsed, 0);

/** How far the header has collapsed at a scroll offset, from 0 (expanded) to 1 (collapsed), clamped both ends. */
export const collapseProgress = (scrollY: number, distance: number): number => {
  'worklet';
  if (distance <= 0) {
    return scrollY > 0 ? 1 : 0;
  }
  return Math.min(Math.max(scrollY / distance, 0), 1);
};

/** Linear interpolation from `from` to `to` at progress `t`. */
export const lerp = (from: number, to: number, t: number): number => {
  'worklet';
  return from + (to - from) * t;
};
