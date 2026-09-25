import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { Announcement } from '../../../lib/announce';
import { announcedAs } from '../../../lib/announce';
import { createStyles } from '../../../lib/styles';

export type ProgressProps = Readonly<{
  /** Whether the thing this rule stands for is still being waited on. */
  busy: boolean;
  announces: Announcement;
}>;

/** How long the segment takes to cross the rule once. */
const SWEEP = 900;

/** What `withRepeat` is given for a thing that stops when the waiting stops and not before. */
const FOREVER = -1;

/** The share of the rule the travelling segment covers. */
const SEGMENT = 0.35;

const START = 0;
const END = 1;

/** No width yet: the rule has not been laid out, so there is nothing for a segment to cross. */
const UNMEASURED = 0;

const useStyles = createStyles((theme) => ({
  // One rule, two grounds, the same two points either way: a thing waiting never moves what is under it. At rest the
  // rule is the paper's red, which is how this app underlines a field; asked to wait, it goes quiet and lets a
  // segment of that red run along it.
  drawn: { height: SIZES.stroke, backgroundColor: theme.primary },
  quiet: { height: SIZES.stroke, backgroundColor: theme.rule, overflow: 'hidden' },
  segment: { position: 'absolute', top: SPACING.none, bottom: SPACING.none, backgroundColor: theme.primary },
}));

/**
 * A rule that says a thing is still being waited on, by a segment of the paper's red crossing it and coming back.
 *
 * It is the honest shape for a wait whose length nobody knows. The journal's search takes between a second and a half
 * and two seconds and cannot say how far along it is, so a rule that filled from left to right would be inventing a
 * measure; this one says « still going » and claims nothing else. It is also the honest shape for a wait whose answer
 * has no shape — a search answers with anything, of any length, on any subject — which is where a page of grey cards
 * would be telling a reader what is coming and would be wrong about it.
 *
 * It is the rule itself and not a second rule under one: a field of this app is underlined in the paper's red, and
 * what waiting does is take that red off the line and send a piece of it travelling. Drawn beside the underline it
 * would have been a red rule under a red rule, which is what the first attempt was, and which cannot be read at all.
 *
 * A reader who has asked their phone for less motion is given the quiet rule and nothing running on it: the red
 * leaves the line while the journal is asked and comes back with the answer, which is the same fact said by a thing
 * that stays where it is.
 *
 * It is announced by its caller, like every other mark this app draws. On a screen that already says « le journal
 * cherche » in words it is furniture and says nothing; on a screen that does not, it is the only thing that does.
 */
export function Progress({ busy, announces }: ProgressProps): ReactNode {
  const styles = useStyles();
  const still = useReducedMotion();
  const [width, setWidth] = useState(UNMEASURED);
  const crossed = useSharedValue(START);
  const crossing = busy && !still && width > UNMEASURED;
  useEffect(() => {
    if (!crossing) {
      return undefined;
    }
    // Set going once the rule has a width to cross: a sweep started before the measure arrives travels nought points,
    // and nothing would set it going again afterwards.
    crossed.set(withRepeat(withTiming(END, { duration: SWEEP, easing: Easing.inOut(Easing.ease) }), FOREVER, true));
    // Stopped when the wait is over, and put back at the start of the rule, which is where the next wait sets off. A
    // sweep goes back and forth between where it sets off and the end of the rule: left running, it set each wait off
    // from wherever the last had got to, further along every time. On the iPhone simulator on 25/09/2026 a second
    // search set off from 56 % of the way, and a later one from 98 %, a segment standing still at the end of its rule.
    return () => {
      cancelAnimation(crossed);
      crossed.set(START);
    };
  }, [crossing, crossed]);
  const slide = useAnimatedStyle(() => ({
    width: width * SEGMENT,
    transform: [{ translateX: crossed.get() * width * (END - SEGMENT) }],
  }));
  return (
    <View
      style={busy ? styles.quiet : styles.drawn}
      onLayout={(event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
      }}
      {...announcedAs(announces)}
    >
      {crossing ? <Animated.View style={[styles.segment, slide]} /> : null}
    </View>
  );
}
