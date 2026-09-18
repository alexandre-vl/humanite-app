import type { DisplayText } from '@huma/contracts';
import { FONT_SIZES, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

export type ChipProps = Readonly<{ label: DisplayText; onPress?: () => void }>;

const useStyles = createStyles((theme) => ({
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: theme.card,
  },
  label: { fontSize: FONT_SIZES.sm, color: theme.textPrimary },
}));

/** A selectable tag, such as a section filter. */
export function Chip({ label, onPress }: ChipProps): ReactNode {
  const styles = useStyles();
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
