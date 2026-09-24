import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { GhostLines } from '#components/ghost';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Breathing } from '#primitives/breathing';
import { COVER_RATIO } from './issue-cover';

/** The covers drawn, named rather than counted: a key that is a place in a list is a key that moves. */
const COVERS = ['s1', 's2', 's3'] as const;

const useStyles = createStyles((theme) => ({
  // The shelf's own measures, newsstand-page.tsx's and issue-cover.tsx's: the covers land where the ghosts stood.
  shelf: { flexDirection: 'row', gap: SPACING.lg, paddingBottom: SPACING.sm },
  shelved: { width: SIZES.cover, gap: SPACING.xs },
  cover: { width: SIZES.cover, aspectRatio: COVER_RATIO, borderRadius: RADII.sm, backgroundColor: theme.card },
}));

/**
 * What stands on the shelf while the numéros are on their way: covers at the size the covers have, each with the
 * line under it that names its day.
 *
 * They are drawn in the ghost's grey and not in the paper's red, which is what a real cover is painted: three red
 * rectangles are a shelf that has arrived, and a reader would read them as covers whose pictures had failed.
 */
export function ShelfStandIn(): ReactNode {
  const styles = useStyles();
  return (
    <Breathing style={styles.shelf}>
      {COVERS.map((cover) => (
        <Box key={cover} style={styles.shelved}>
          <Box style={styles.cover} />
          <GhostLines lines={[`${cover}-day`]} weight="small" />
        </Box>
      ))}
    </Breathing>
  );
}
