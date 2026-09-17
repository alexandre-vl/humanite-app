import type { DisplayText } from '@huma/contracts';
import { FONT_WEIGHTS, LIGHT_THEME, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

export type ButtonProps = Readonly<{ label: DisplayText; onPress?: () => void }>;

const styles = createStyles({
  button: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    backgroundColor: LIGHT_THEME.primary,
  },
  label: { color: LIGHT_THEME.textInverse, fontWeight: FONT_WEIGHTS.bold },
});

/** A primary action: a pill that answers a press with a label. */
export function Button({ label, onPress }: ButtonProps): ReactNode {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
