import type { DisplayText } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
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
}));

/** A small status marker, such as the premium tag on an item. */
export function Badge({ label }: BadgeProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.badge}>
      <Text variant="label">{label}</Text>
    </Box>
  );
}
