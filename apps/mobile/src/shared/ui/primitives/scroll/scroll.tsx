import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import type { StyleRef } from '../../../lib/styles';
import { createStyles } from '../../../lib/styles';

const useStyles = createStyles(() => ({
  // A region that scrolls down is given the height of the ground it is in, not left to find one: sized to its content,
  // a short page would leave the rest of the ground unreachable. Across, it is as tall as what it holds.
  fill: { flex: 1 },
}));

export type ScrollProps = Readonly<{
  children?: ReactNode;
  axis: 'vertical' | 'horizontal';
  style?: StyleRef;
  contentStyle?: StyleRef;
  /**
   * Where along its own axis the region should be, when something other than the finger decides. A band of labels
   * wider than the screen uses it to bring the chosen label into view after a swipe chose it elsewhere. It is a
   * measurement taken from what the region has laid out, not a token, and leaving it out leaves the region alone.
   */
  at?: number | undefined;
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
export function Scroll({ children, axis, style, contentStyle, at }: ScrollProps): ReactNode {
  const styles = useStyles();
  const scroll = useRef<ScrollView>(null);
  const across = axis === 'horizontal';
  useEffect(() => {
    if (at === undefined) {
      return;
    }
    scroll.current?.scrollTo(across ? { x: at, animated: true } : { y: at, animated: true });
  }, [at, across]);
  return (
    <ScrollView
      ref={scroll}
      horizontal={across}
      showsHorizontalScrollIndicator={false}
      style={across ? style : [styles.fill, style]}
      contentContainerStyle={contentStyle}
    >
      {children}
    </ScrollView>
  );
}
