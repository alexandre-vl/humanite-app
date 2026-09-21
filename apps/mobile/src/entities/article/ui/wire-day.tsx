import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type WireDayProps = Readonly<{ label: DisplayText }>;

const useStyles = createStyles((theme) => ({
  band: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  ground: { backgroundColor: theme.primary },
}));

/**
 * The head of a day's run on the wire.
 *
 * Its ground is painted rather than left to the screen behind it: the list mounts this a second time, pinned at the
 * top of the frame, and the rows sliding underneath would read straight through a transparent one.
 *
 * It is the whole of the paper's red on this screen now, and that is the point. The wire used to be printed red from
 * edge to edge with every word on it in white — the app's one knowing departure from the contrast the rest of it
 * holds to, spent on a screenful of running text at 3.83 to one, and with the red covering everything there was
 * nothing left for the red to mark. Here it marks the one thing worth marking on a list ordered by time: where one
 * day ends and the next begins. The band is padded evenly, having a page under it now rather than more of itself.
 */
export function WireDay({ label }: WireDayProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.ground}>
      <Box style={styles.band}>
        <Text variant="label" tone="onPrimary" heading>
          {label}
        </Text>
      </Box>
    </Box>
  );
}
