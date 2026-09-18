import type { DisplayText } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

export type ButtonProps = Readonly<{ label: DisplayText; onPress?: () => void }>;

const useStyles = createStyles((theme) => ({
  button: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    backgroundColor: theme.primary,
  },
}));

/** A primary action: a pill that answers a press with a label. */
export function Button({ label, onPress }: ButtonProps): ReactNode {
  const styles = useStyles();
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text variant="label" tone="textInverse">
        {label}
      </Text>
    </Pressable>
  );
}
