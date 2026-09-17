import type { DisplayText } from '@huma/contracts';
import { FONT_SIZES, FONT_WEIGHTS, LIGHT_THEME, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type BadgeProps = Readonly<{ label: DisplayText }>;

const styles = createStyles({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: LIGHT_THEME.premium,
  },
  label: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: LIGHT_THEME.textPrimary },
});

/** A small status marker, such as the premium tag on an item. */
export function Badge({ label }: BadgeProps): ReactNode {
  return (
    <Box style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </Box>
  );
}
