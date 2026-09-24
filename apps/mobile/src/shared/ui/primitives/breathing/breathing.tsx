import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { StyleRef } from '../../../lib/styles';

export type BreathingProps = Readonly<{ children?: ReactNode; style?: StyleRef }>;

/** Full, and as faint as it goes. The floor is high enough that the shape never reads as having left the page. */
const CALM = 1;
const FAINT = 0.45;

/**
 * One way of the breath, in milliseconds. Slow on purpose: at half a second it reads as a blink and asks to be
 * watched, and something that asks to be watched while nothing happens is worse than something still.
 */
const HALF_BREATH = 1100;

/** What the library reads as « never stop ». */
const FOREVER = -1;

/**
 * Makes what is under it breathe: a slow fall and rise of opacity, for as long as it is on screen.
 *
 * It exists because a stand-in that does not move reads as a thing that is finished and empty, where one that moves
 * reads as a thing on its way. The difference is the whole of what a reader is told while they wait, and it is worth
 * one primitive.
 *
 * It is a primitive and not a component because the animation library is confined to this place, and because nothing
 * here knows what it is standing in for: a group of lines shaped like prose, a row shaped like a card, a block the
 * size of a picture. Whoever knows draws it; this lends it a pulse.
 *
 * A reader who has asked their phone for less motion gets none: the shape is drawn full and still. That is the same
 * answer the platform gives its own indicators, and the only one that suits a sensitivity the app cannot see.
 */
export function Breathing({ children, style }: BreathingProps): ReactNode {
  const still = useReducedMotion();
  const depth = useSharedValue(CALM);
  useEffect(() => {
    if (still) {
      return;
    }
    depth.set(
      withRepeat(withTiming(FAINT, { duration: HALF_BREATH, easing: Easing.inOut(Easing.ease) }), FOREVER, true),
    );
  }, [depth, still]);
  const breath = useAnimatedStyle(() => ({ opacity: depth.get() }));
  return <Animated.View style={[style, breath]}>{children}</Animated.View>;
}
