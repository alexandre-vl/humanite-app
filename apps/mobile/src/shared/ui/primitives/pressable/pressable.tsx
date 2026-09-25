import type { DisplayText } from '@huma/contracts';
import type { Space } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable as NativePressable } from 'react-native';
import { announcedAs, DECORATIVE } from '../../../lib/announce';
import type { StyleRef } from '../../../lib/styles';

/** A press a target drawn under another one hands up to it, named as the target it comes from is named. */
type LentPress = Readonly<{ label: DisplayText; run: () => void }>;

/** How a target takes a press lent to it, and the way it hands it back when the lender goes. */
type Borrower = (press: LentPress) => () => void;

/** The target a pressable is drawn under, if it is drawn under one. */
const Borrowing = createContext<Borrower | null>(null);

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
   *
   * It reaches as far as the nearest view drawn around the target, and no further: iOS looks for a touch outside a
   * view only when something inside it is laid out past its edges (`RCTViewComponentView.mm`, `betterHitTest`). A box
   * that only lays its children out is no view by then, the renderer having flattened it away, so it stops nothing — a
   * card's foot held to its bookmark's thirty-two points let a press five points above them keep the article, on the
   * iPhone simulator on 25/09/2026. A box that paints a ground or a line is a view, and the reach stops at its edges.
   */
  hitSlop?: Space | undefined;
  /**
   * Where the target came to rest inside whatever laid it out, once that is known. A band of choices wider than the
   * screen reads it to know how far along the chosen one sits, which is the only way to bring it into view: what a
   * label measures depends on the word, the face and the step the reader set, and none of those is known in advance.
   */
  onMeasure?: ((frame: Readonly<{ x: number; width: number }>) => void) | undefined;
  /**
   * That the target is there for the finger alone. A reader listening does not stop on it, because what it acts on is
   * a stop of its own: a field's name, pressed, puts the caret in the field, which a reader listening reaches by the
   * field itself and hears named there.
   */
  announces?: typeof DECORATIVE | undefined;
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
 *
 * A target drawn under another one cannot be reached by a reader listening: the outer target is the one thing they
 * land on, and it reads out everything under it as its own name. The bookmark on a card of the feed was that — on
 * the iPhone simulator on 25/09/2026 the card read « …, Ajouter à mes lectures » and offered no way to do it. So a
 * named target under another one lends it its press, and says nothing itself: the outer one offers it as an action,
 * under the inner one's name, which is how the platform's own lists offer what a row holds besides opening it.
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
  announces,
}: PressableProps): ReactNode {
  const borrower = use(Borrowing);
  const [borrowed, setBorrowed] = useState<readonly LentPress[]>([]);
  const borrow = useCallback<Borrower>((press) => {
    setBorrowed((presses) => [...presses, press]);
    return () => {
      setBorrowed((presses) => presses.filter((each) => each !== press));
    };
  }, []);
  // The press lent is the one in force when it is used, not the one there was when it was lent: a toggle's press
  // changes with what it toggles, and lending it again on every render would take it back and forth up the tree.
  const press = useRef(onPress);
  useEffect(() => {
    press.current = onPress;
  });
  const lends = borrower !== null && label !== undefined && onPress !== undefined;
  useEffect(() => {
    if (borrower === null || label === undefined || !lends) {
      return undefined;
    }
    return borrower({
      label,
      run: () => {
        press.current?.();
      },
    });
  }, [borrower, label, lends]);
  return (
    <Borrowing.Provider value={borrow}>
      <NativePressable
        style={style}
        hitSlop={hitSlop}
        onPress={onPress}
        onPressIn={onPressIn}
        accessibilityLabel={lends ? undefined : label}
        accessibilityRole={role}
        accessibilityState={selected === undefined ? undefined : { selected }}
        accessibilityActions={
          borrowed.length === 0
            ? undefined
            : borrowed.map((each, index) => ({ name: String(index), label: each.label }))
        }
        onAccessibilityAction={
          borrowed.length === 0
            ? undefined
            : (event) => {
                borrowed[Number(event.nativeEvent.actionName)]?.run();
              }
        }
        {...(lends || announces === DECORATIVE ? announcedAs(DECORATIVE) : {})}
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
    </Borrowing.Provider>
  );
}
