import type { DisplayText } from '@huma/contracts';
import type { Space } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Pressable as NativePressable } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type PressableProps = Readonly<{
  children?: ReactNode;
  style?: StyleRef;
  onPress?: (() => void) | undefined;
  /**
   * Called the moment a finger lands, before anyone knows whether it will lift here.
   *
   * What it is for is fetching: the press, the lift and the screen that follows are together a few hundred
   * milliseconds, and a reading started at the first of the three is usually answered by the last. It fires on
   * presses that end in nothing — a finger that slides away, a scroll begun on a card — so whatever it does must be
   * worth doing for its own sake and must not be seen if it is wasted.
   */
  onPressIn?: (() => void) | undefined;
  label?: DisplayText | undefined;
  role?: 'radio' | 'button' | 'link' | undefined;
  selected?: boolean | undefined;
  /**
   * How far past its own edges the target answers a finger.
   *
   * A finger needs more room than a mark needs, and until now the only way to give it any was to draw the mark inside
   * a box the size of the finger — which spends that room twice, once on the touch and once on the layout. A control
   * hung at the end of a line of small capitals then made the whole line as tall as a finger, and on a screen where
   * that line had nothing else to say it was a band of empty page with one mark floating in it. Given here, the room
   * is spent on the touch alone and the mark takes the space a mark takes.
   */
  hitSlop?: Space | undefined;
  /**
   * Where the target came to rest inside whatever laid it out, once that is known. A band of choices wider than the
   * screen reads it to know how far along the chosen one sits, which is the only way to bring it into view: what a
   * label measures depends on the word, the face and the step the reader set, and none of those is known in advance.
   */
  onMeasure?: ((frame: Readonly<{ x: number; width: number }>) => void) | undefined;
}>;

/**
 * A touch target laid out by a StyleRef; the one primitive that answers a press.
 *
 * A target whose children say what it does needs no label — a screen reader reads them. One drawn as a symbol says
 * nothing out loud, and the label is the only thing it can be announced by, which is why it is a DisplayText like any
 * other text the app puts in front of a reader.
 *
 * A target that is one option among several says so too: the role names what it is and `selected` whether it is the
 * one in force, so a row of choices the app draws itself is announced the way the platform's own would be. The role is
 * a closed set rather than the platform's whole list — it holds the shapes the app has, and grows when another
 * appears. The paper has three: a choice in a band, a thing that acts where it stands, and a thing that opens
 * something else. Without one a target is announced as a name and nothing more, and a reader hears what it says
 * without being told they may press it.
 */
export function Pressable({
  children,
  style,
  onPress,
  onPressIn,
  label,
  role,
  selected,
  hitSlop,
  onMeasure,
}: PressableProps): ReactNode {
  return (
    <NativePressable
      style={style}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityLabel={label}
      accessibilityRole={role}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onLayout={
        onMeasure === undefined
          ? undefined
          : (event) => {
              onMeasure({ x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width });
            }
      }
    >
      {children}
    </NativePressable>
  );
}
