import type { DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
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
    backgroundColor: theme.border,
    borderWidth: SIZES.stroke,
    borderColor: theme.border,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  option: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: theme.surface },
  optionActive: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: theme.primary },
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
 */
export function SegmentedControl<Id extends string>({ items, active, onSelect }: SegmentedControlProps<Id>): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles[item.id === active ? 'optionActive' : 'option']}
          role="radio"
          selected={item.id === active}
          onPress={() => {
            onSelect(item.id);
          }}
        >
          <Text variant="label" tone={item.id === active ? 'onPrimary' : 'textPrimary'} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </Box>
  );
}
