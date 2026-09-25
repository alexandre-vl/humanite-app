import type { DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING, typographyAt } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { createStyles, useTypesetting } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

/** One choice in a row of them: what it is called, and what the row reports when it is chosen. */
export type SegmentedItem<Id extends string> = Readonly<{ id: Id; label: DisplayText }>;

export type SegmentedControlProps<Id extends string> = Readonly<{
  items: readonly SegmentedItem<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
}>;

const useStyles = createStyles((theme) => ({
  // The hairlines between the choices are the ground showing through: a row whose cells are spaced by the width of a
  // rule, over the colour a rule is drawn in, needs no rule of its own — and a style holds one border, not three.
  row: {
    flexDirection: 'row',
    gap: SIZES.stroke,
    backgroundColor: theme.rule,
    borderWidth: SIZES.stroke,
    borderColor: theme.rule,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  // The same choices one under the other, for when the row is too narrow for their names: see the note on the control.
  column: {
    flexDirection: 'column',
    gap: SIZES.stroke,
    backgroundColor: theme.rule,
    borderWidth: SIZES.stroke,
    borderColor: theme.rule,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  // A choice keeps a margin of its own on either side, so a name that grows with the reader's step wraps onto a second
  // line rather than running to the edges of its cell. Measured on an A065 without it: « Très grand » at the largest
  // step, in the face meant for readers who need one, left one pixel on the left and three on the right — a label that
  // fitted by luck, and would not have fitted the next French word.
  option: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  optionActive: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    backgroundColor: theme.primary,
  },
  stacked: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  stackedActive: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    backgroundColor: theme.primary,
  },
}));

/**
 * A row of choices, one of which is in force, all of them in view at once.
 *
 * A setting with a handful of named steps is read and changed in one gesture here, where a menu would hide the others
 * behind a tap and a slider would ask for a precision a reader does not have. The app draws it rather than borrowing
 * the platform's, which wears the system's own shape on each side and neither of them the paper's; what it borrows
 * instead is how such a control is announced, each choice naming itself as one option among several and saying
 * whether it is the one showing.
 *
 * It reports a tap and holds nothing: the screen above it owns which choice is in force. The identifiers keep their
 * own type through it, so a row of text sizes reports a text size and nothing else.
 *
 * When the row is too narrow for the names, the choices stand one under the other instead. A name may wrap onto a
 * second line between its words, and does; what it may not do is lose a word to the edge of its cell, which the
 * platform does to a word wider than the cell: at the phone's largest text size, on the iPhone simulator on
 * 25/09/2026, the themes read « Syst » over « ème », « Clai » over « r », « Som » over « bre ». So each name reports
 * whether it had to be cut, and one cut is enough to stack them all — the way the platform's own controls change
 * direction at its largest sizes. A change of the reader's step, of the phone's text size or of the names tries the
 * row again, since any of them may give the names room back.
 */
export function SegmentedControl<Id extends string>({ items, active, onSelect }: SegmentedControlProps<Id>): ReactNode {
  const styles = useStyles();
  const { scale, faces, phone } = useTypesetting();
  // What the row was last found too narrow under: the type the names are set in and the names. While it holds, the
  // choices stand one under the other; once any part of it moves, they are tried in a row again.
  const { family, size } = typographyAt('label', scale, faces, phone);
  const setting = [family, size, ...items.map((item) => item.label)].join('\n');
  const [cramped, setCramped] = useState<string | null>(null);
  const stacked = cramped === setting;
  return (
    <Box style={styles[stacked ? 'column' : 'row']}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={
            stacked
              ? styles[item.id === active ? 'stackedActive' : 'stacked']
              : styles[item.id === active ? 'optionActive' : 'option']
          }
          role="radio"
          selected={item.id === active}
          onPress={() => {
            onSelect(item.id);
          }}
        >
          <Text
            variant="label"
            tone={item.id === active ? 'onPrimary' : 'textPrimary'}
            align="center"
            onWordCut={
              stacked
                ? undefined
                : (cut) => {
                    if (cut) {
                      setCramped(setting);
                    }
                  }
            }
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </Box>
  );
}
