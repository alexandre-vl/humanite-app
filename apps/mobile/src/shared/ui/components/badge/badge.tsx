import type { DisplayText } from '@huma/contracts';
import { FONT_FAMILIES, FONT_SIZES, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type BadgeProps = Readonly<{ label: DisplayText }>;

const useStyles = createStyles((theme) => ({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: theme.premium,
  },
  label: { fontSize: FONT_SIZES.xs, fontFamily: FONT_FAMILIES.body.bold, color: theme.textPrimary },
}));

/** A small status marker, such as the premium tag on an item. */
export function Badge({ label }: BadgeProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </Box>
  );
}
