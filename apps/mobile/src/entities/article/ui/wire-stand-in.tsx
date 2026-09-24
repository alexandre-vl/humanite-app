import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { GhostLines } from '#components/ghost';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Breathing } from '#primitives/breathing';

/** The rows drawn, named rather than counted, since a key that is a place in a list is a key that moves. */
const ROWS = ['w1', 'w2', 'w3', 'w4', 'w5'] as const;

const useStyles = createStyles((theme) => ({
  // The band of a day and the rows under it, at wire-day.tsx's and wire-row.tsx's own measures.
  band: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, backgroundColor: theme.primary },
  day: { width: SPACING.xxxl, height: SPACING.sm, borderRadius: RADII.sm, backgroundColor: theme.background },
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  rail: { width: SPACING.md, alignSelf: 'stretch', alignItems: 'center' },
  rule: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    borderLeftWidth: SIZES.stroke,
    borderStyle: 'dashed',
    borderColor: theme.rule,
  },
  ring: {
    width: SPACING.sm,
    height: SPACING.sm,
    marginTop: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: SIZES.stroke,
    borderColor: theme.card,
    backgroundColor: theme.background,
  },
  words: { flex: 1, paddingLeft: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.xs },
  hour: { width: SPACING.xl, height: SPACING.sm, borderRadius: RADII.sm, backgroundColor: theme.card },
}));

/**
 * What stands in the wire's place while it is on its way: the thread, its beads, and the hour and title of each item
 * hanging from them.
 *
 * The thread and the band of the day are drawn as they are and not as ghosts of themselves. They are the screen's
 * furniture rather than its content: whatever the wire answers, it answers under a day and on a thread, so drawing
 * them pale and then repainting them would be a screen changing colour for nothing. What is unknown is what hangs
 * from them, and only that is a ghost.
 *
 * For the same reason the band does not breathe and the rows do. A breath says « this is coming »; a thing already
 * here has no business saying it.
 */
export function WireStandIn(): ReactNode {
  const styles = useStyles();
  return (
    <Box>
      <Box style={styles.band}>
        <Box style={styles.day} />
      </Box>
      <Breathing>
        {ROWS.map((row) => (
          <Box key={row} style={styles.row}>
            <Box style={styles.rail}>
              <Box style={styles.rule} />
              <Box style={styles.ring} />
            </Box>
            <Box style={styles.words}>
              <Box style={styles.hour} />
              <GhostLines lines={[`${row}-a`, `${row}-b`]} weight="title" stops="nearly" />
            </Box>
          </Box>
        ))}
      </Breathing>
    </Box>
  );
}
