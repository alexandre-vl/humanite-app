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
      // A press on a control answers the first time, keyboard up or not, and a drag puts the keyboard away. Left to the
      // platform, the first press was spent closing the keyboard: on the iPhone simulator on 25/09/2026, the sign-in
      // button pressed with an identifier typed closed the keyboard and said nothing, and answered the second press.
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // On iOS the region makes room under its content for the keyboard, and brings the field being typed in above
      // it. Without it, at a large text size, the password was typed blind: on the iPhone simulator on 25/09/2026 its
      // field stayed at 578 points with the keyboard's first row of keys at 597, and rose to 490 with it. Android
      // shrinks the window around the keyboard instead, and ignores it.
      automaticallyAdjustKeyboardInsets
      // Down a screen, the region lets iOS lend its content whatever of the screen's bars lies over its frame, as the
      // list does: from iOS 26 the tab bar and the player it carries float over the screen, and a page reaching its
      // foot ran under them. On the iPhone simulator under iOS 27.0, on 20/11/2026, the account screen with an article
      // in the player printed the end of its last paragraph, from 712 to 771 points, under the player at 735, and
      // would not scroll to bring it out. A band that scrolls across is never at the foot of a screen, and is left alone.
      contentInsetAdjustmentBehavior={across ? 'never' : 'automatic'}
    >
      {children}
    </ScrollView>
  );
}
