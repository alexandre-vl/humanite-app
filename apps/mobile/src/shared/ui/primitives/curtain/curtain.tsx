import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { StyleRef } from '../../../lib/styles';

export type CurtainProps = Readonly<{
  children?: ReactNode;
  style?: StyleRef;
  /** Whether the curtain has been raised. Once raised it does not come down again. */
  lifted: boolean;
}>;

/** Drawn, and gone. */
const DOWN = 1;
const UP = 0;

/**
 * How long the rise takes. Short enough that nobody waits on it, long enough to read as one thing giving way to
 * another rather than as a frame being dropped.
 */
const RISE = 320;

/**
 * A layer laid over everything beside it, which rises out of the way when it is told to and stays out.
 *
 * It exists for the moment between a phone's own opening field and the first page of the paper. Those two are the
 * same colour, so what a reader should see is the masthead fading off a ground that never moves — not one screen
 * being swapped for another. A curtain gives exactly that: what is under it is already there, already laid out and
 * already painted, and the only thing that changes is whether this is still in front of it.
 *
 * It never takes a touch, raised or not. It carries nothing a finger would want and it sits over a page that does,
 * so a reader who presses a headline through the last frames of the rise reaches the headline.
 *
 * Once it is off it is taken down, and not merely made transparent. A layer at nought opacity is still a layer: it is
 * laid out with every frame under it, and it is still read out — a reader listening to the front page would have been
 * told the paper's name, over and over, above every headline on it, by a thing that was no longer on the screen.
 *
 * A reader who has asked their phone for less motion is given the cut instead of the fade, which is what that
 * setting asks for.
 */
export function Curtain({ children, style, lifted }: CurtainProps): ReactNode {
  const still = useReducedMotion();
  const drawn = useSharedValue(DOWN);
  const [risen, setRisen] = useState(false);
  useEffect(() => {
    if (!lifted || still) {
      return;
    }
    drawn.set(
      withTiming(UP, { duration: RISE, easing: Easing.out(Easing.ease) }, (finished) => {
        // A rise cut short left what it was covering half-covered by a layer nothing would take down again. Only a
        // rise that arrived takes it down; one that was interrupted leaves it where it is, still visible, still fading.
        if (finished === true) {
          scheduleOnRN(setRisen, true);
        }
      }),
    );
  }, [drawn, lifted, still]);
  const rise = useAnimatedStyle(() => ({ opacity: drawn.get() }));
  // A cut is not an animation and has nothing to report the end of: asked for stillness, the layer is simply not
  // there on the render that lifts it. The fade has an end to wait for, and waits for it.
  if (risen || (lifted && still)) {
    return null;
  }
  return (
    <Animated.View pointerEvents="none" style={[style, rise]}>
      {children}
    </Animated.View>
  );
}
