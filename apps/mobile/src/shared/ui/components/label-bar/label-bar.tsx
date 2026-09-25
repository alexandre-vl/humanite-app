import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import type { NamePlace } from '../../primitives/pager';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

/** One choice in a band: what it is called, and what the band reports when it is chosen. */
export type LabelBarItem<Id extends string> = Readonly<{ id: Id; label: DisplayText }>;

export type LabelBarProps<Id extends string> = Readonly<{
  items: readonly LabelBarItem<Id>[];
  active?: Id | undefined;
  onSelect: (id: Id) => void;
  /**
   * Where each label's word came to rest, reported in the order they are drawn, once they have all been laid out.
   *
   * What a label measures depends on its word, on the face it is set in and on the step the reader asked for, so
   * nobody can work it out in advance. The band this row is laid in travels a rule under the label in force and
   * brings the one ahead into view, and these are the only numbers it has to do either with.
   *
   * The word and not the target around it. A label reaches past its word so that a finger lands on it, and that reach
   * is the finger's business: a rule as wide as the target stood twelve points past the word on either side, and under
   * the first label it ran from the very edge of the screen (iPhone simulator, 25/09/2026).
   */
  onPlaces?: ((places: readonly NamePlace[]) => void) | undefined;
}>;

/** Where a label stands before it has been laid out, which is nowhere and no width. */
const NOWHERE: NamePlace = { x: 0, width: 0 };

/** The room a label keeps either side of its word, inside its own target. */
const INSET = SPACING.md;

const useStyles = createStyles(() => ({
  // The label carries the band's inset, the row having none to give: the rule under it is laid against the row's own
  // edge, and a padded row would set the two a padding apart.
  label: { paddingHorizontal: INSET, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  // What the row keeps before its first label and after its last, which is the page's margin less a label's inset:
  // the first word then starts where every card's words start. It started four points short of them.
  edge: { width: SPACING.xs },
}));

type LabelProps = Readonly<{
  label: DisplayText;
  /** Whether this is the choice in force, or nothing at all when the band names none. */
  chosen?: boolean | undefined;
  onPress: () => void;
  onMeasure: (frame: NamePlace) => void;
}>;

/**
 * One label of the row, drawn on its own so that a change of which one is in force redraws two of them and not all.
 *
 * The row is told the new choice in the same breath as the page lands, and that render is the last thing standing
 * between the reader and a turn that never stops: measured on the A065 on 25/09/2026, it held the screen for 40 ms
 * at the end of every turn. Nine labels rebuilt where two changed is most of what it was doing.
 */
function Label({ label, chosen, onPress, onMeasure }: LabelProps): ReactNode {
  const styles = useStyles();
  return (
    // The rule under the chosen label is a colour and nothing else, which the reference itself logs as a fault of the
    // screen it copies: a state told by colour alone is no state at all to a reader who cannot see it. Named a
    // choice, and told which one is in force, the row is announced the way the platform's own controls are.
    <Pressable
      style={styles.label}
      label={label}
      role={chosen === undefined ? undefined : 'radio'}
      selected={chosen}
      onPress={onPress}
      onMeasure={onMeasure}
    >
      {/* The label of the choice in force is set in the page's own ink and the others in the quiet one. The rule
          under it was the only thing that changed, which asks a reader to compare two labels to see which is which;
          the ink says it on each label by itself. A row that names no choice sets them all alike — there is nothing
          quieter than the rest when there is no rest. */}
      <Text variant="label" tone={chosen === false ? 'textMuted' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A row of choices, each named and pressable, for the band of a screen that shows one of them at a time.
 *
 * It reports a tap and goes nowhere itself, so a screen may make choosing mean whatever it means there: opening
 * another screen, replacing the one being read, or swapping what this one shows. The identifiers keep their own type
 * through it, so a row of sections reports a section and nothing else.
 *
 * It does not scroll and draws no rule under the choice in force, and neither of those is an omission. Both are the
 * pager's, because both move with the pages: the rule travels under the finger, from one label to the next, and the
 * row travels with it — on the thread that draws, from the scroll of the pages themselves, with no render in
 * between. A rule drawn here could only be told by a render, and a render is what froze the screen on every turn.
 * What this owes the band is where its labels came to rest, which it measures and reports.
 */
export function LabelBar<Id extends string>({ items, active, onSelect, onPlaces }: LabelBarProps<Id>): ReactNode {
  const styles = useStyles();
  // Kept in a ref because the labels report one at a time, across as many layouts as there are of them: a map built
  // while rendering would be a different map for each report, and the row would never come to hold them all.
  const places = useRef(new Map<Id, NamePlace>());
  const settle = (id: Id, frame: NamePlace): void => {
    places.current.set(id, { x: frame.x + INSET, width: frame.width - 2 * INSET });
    if (items.every((item) => places.current.has(item.id))) {
      onPlaces?.(items.map((item) => places.current.get(item.id) ?? NOWHERE));
    }
  };
  return (
    <>
      <Box style={styles.edge} />
      {items.map((item) => (
        <Label
          key={item.id}
          label={item.label}
          chosen={active === undefined ? undefined : item.id === active}
          onPress={() => {
            onSelect(item.id);
          }}
          onMeasure={(frame) => {
            settle(item.id, frame);
          }}
        />
      ))}
      <Box style={styles.edge} />
    </>
  );
}
