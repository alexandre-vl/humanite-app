import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type WireDayProps = Readonly<{ label: DisplayText }>;

const useStyles = createStyles((theme) => ({
  band: { paddingTop: SPACING.lg, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  ground: { backgroundColor: theme.primary },
}));

/**
 * The head of a day's run on the wire.
 *
 * Its ground is painted rather than left to the screen behind it: the list mounts this a second time, pinned at the
 * top of the frame, and the rows sliding underneath would read straight through a transparent one.
 */
export function WireDay({ label }: WireDayProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.ground}>
      <Box style={styles.band}>
        <Text variant="label" tone="onPrimary">
          {label}
        </Text>
      </Box>
    </Box>
  );
}
