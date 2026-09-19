import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type ScrollProps = Readonly<{
  children?: ReactNode;
  axis?: 'vertical' | 'horizontal';
  style?: StyleRef;
  contentStyle?: StyleRef;
}>;

/**
 * A scrolling region: its own frame takes `style`, the content it scrolls takes `contentStyle`.
 *
 * The axis says more than a direction. A screen owes its vertical scroll to a single list, so a region that scrolls
 * that way beside one would dispute the gesture; a band that scrolls across takes the other axis and disputes nothing.
 * Across, the bar is hidden: the screens this copies show no rail, only the label cut at the edge.
 */
export function Scroll({ children, axis = 'vertical', style, contentStyle }: ScrollProps): ReactNode {
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
