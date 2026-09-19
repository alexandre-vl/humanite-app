import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type ScrollProps = Readonly<{
  children?: ReactNode;
  axis: 'vertical' | 'horizontal';
  style?: StyleRef;
  contentStyle?: StyleRef;
}>;

/**
 * A scrolling region: its own frame takes `style`, the content it scrolls takes `contentStyle`.
 *
 * The axis says more than a direction. A screen owes its vertical scroll to a single list, so a region that scrolls
 * that way beside one would dispute the gesture; a band that scrolls across takes the other axis and disputes nothing.
 * Across, the bar is hidden: the screens this copies show no rail, only the label cut at the edge.
 *
 * It is required rather than defaulted because the default was the whole risk: a screen that wrote `<Scroll>` beside a
 * list took the list's axis away without ever naming it, and a rule broken in silence is a rule nothing holds. Asking
 * the question every time makes the answer readable at the call site, which is the only place that knows what else the
 * screen mounts.
 */
export function Scroll({ children, axis, style, contentStyle }: ScrollProps): ReactNode {
  return (
    <ScrollView
      horizontal={axis === 'horizontal'}
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={contentStyle}
    >
      {children}
    </ScrollView>
  );
}
