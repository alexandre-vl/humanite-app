import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Pressable } from '../../primitives/pressable';
import { Scroll } from '../../primitives/scroll';
import { Text } from '../../primitives/text';

/** One choice in a band: what it is called, and what the band reports when it is chosen. */
export type LabelBarItem<Id extends string> = Readonly<{ id: Id; label: DisplayText }>;

export type LabelBarProps<Id extends string> = Readonly<{
  items: readonly LabelBarItem<Id>[];
  active?: Id | undefined;
  onSelect: (id: Id) => void;
}>;

const useStyles = createStyles((theme) => ({
  bar: { flex: 1, backgroundColor: theme.surface },
  labels: { alignItems: 'flex-end', paddingHorizontal: SPACING.sm },
  label: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  // The rule under a choice is drawn whether or not it is the one showing, in the ground's own colour when it is not:
  // a rule that appeared would push every label up by its own height the moment a choice was made.
  rule: { height: SPACING.xs, backgroundColor: theme.surface },
  ruleActive: { height: SPACING.xs, backgroundColor: theme.primary },
}));

/** How much of the band is kept to the left of the chosen label, so that it reads as one of a row and not as its end. */
const BEFORE = SPACING.xxxl;

/**
 * A band of choices that scrolls across the screen, naming the one showing with a rule under its label.
 *
 * It reports a tap and goes nowhere itself, so a screen may make choosing mean whatever it means there: opening
 * another screen, replacing the one being read, or swapping what this one shows. The identifiers keep their own type
 * through it, so a band of sections reports a section and nothing else.
 *
 * The band also follows a choice made somewhere else. The screen it names is now turned by swiping across it, and a
 * band that stayed put would leave the name of what is being read off the edge of itself after two pages. Each label
 * reports where it came to rest, and the band scrolls to the one in force — which cannot be worked out in advance,
 * a label measuring what its word, its face and the reader's own step make it measure.
 */
export function LabelBar<Id extends string>({ items, active, onSelect }: LabelBarProps<Id>): ReactNode {
  const styles = useStyles();
  const places = useRef(new Map<Id, number>());
  const [at, setAt] = useState<number | undefined>(undefined);
  // In an effect and not while rendering: where a label came to rest is a measurement the band keeps in a ref, and a
  // ref read during a render is a value React is free to have changed under it.
  useEffect(() => {
    if (active === undefined) {
      return;
    }
    const x = places.current.get(active);
    if (x !== undefined) {
      setAt(Math.max(0, x - BEFORE));
    }
  }, [active]);
  return (
    <Scroll axis="horizontal" style={styles.bar} contentStyle={styles.labels} at={at}>
      {items.map((item) => (
        // The rule under the chosen label is a colour and nothing else, which the reference itself logs as a fault of
        // the screen it copies: a state told by colour alone is no state at all to a reader who cannot see it. Named
        // a choice, and told which one is in force, the band is announced the way the platform's own controls are.
        <Pressable
          key={item.id}
          style={styles.label}
          label={item.label}
          role={active === undefined ? undefined : 'radio'}
          selected={active === undefined ? undefined : item.id === active}
          onPress={() => {
            onSelect(item.id);
          }}
          onMeasure={(frame) => {
            places.current.set(item.id, frame.x);
          }}
        >
          {/* The label of the choice in force is set in the page's own ink and the others in the quiet one. The rule
              under it was the only thing that changed, which asks a reader to compare two labels to see which is
              which; the ink says it on each label by itself. A band that names no choice sets them all alike — there
              is nothing quieter than the rest when there is no rest. */}
          <Text variant="label" tone={active !== undefined && item.id !== active ? 'textMuted' : 'textPrimary'}>
            {item.label}
          </Text>
          <Box style={styles[item.id === active ? 'ruleActive' : 'rule']} />
        </Pressable>
      ))}
    </Scroll>
  );
}
