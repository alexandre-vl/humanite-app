import type { DisplayText } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

export type ButtonProps = Readonly<{ label: DisplayText; onPress: () => void }>;

/**
 * What the pill answers past its own edges. At the paper's step it is 35,7 points tall (iPhone simulator, 25/09/2026),
 * short of the forty-four a finger is owed; eight more on every side reach past it without drawing a larger pill, and
 * every screen that lays one leaves at least that much page around it, so the reach takes no press from its neighbours.
 */
const REACH = SPACING.sm;

const useStyles = createStyles((theme) => ({
  button: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    backgroundColor: theme.primary,
  },
}));

/**
 * A primary action: a pill that answers a press with a label.
 *
 * What it does when pressed is required rather than offered. A button is a promise the shape of the thing keeps — a
 * reader presses it because it looks pressable — so one that leads nowhere is a promise broken silently, and the call
 * for support carried exactly that for a while.
 */
export function Button({ label, onPress }: ButtonProps): ReactNode {
  const styles = useStyles();
  return (
    <Pressable style={styles.button} onPress={onPress} label={label} role="button" hitSlop={REACH}>
      <Text variant="label" tone="onPrimary">
        {label}
      </Text>
    </Pressable>
  );
}
