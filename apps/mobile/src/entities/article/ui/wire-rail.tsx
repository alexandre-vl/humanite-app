import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';

export type WireRailProps = Readonly<{
  /** What hangs on the thread at this line of the wire: an item's bead, or nothing. */
  children?: ReactNode;
}>;

const useStyles = createStyles((theme) => ({
  // The rail is a column the width of a bead, not a column the width of a date. It held the hour beside it — the day
  // and the hour, under a band naming the day — and between the two the words began 140 points into a 411-point
  // screen. They begin 40 points in now, which is 40 % more line for the same title.
  rail: { width: SPACING.md, alignSelf: 'stretch', alignItems: 'center' },
  thread: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    borderLeftWidth: SIZES.stroke,
    borderStyle: 'dashed',
    borderColor: theme.rule,
  },
}));

/**
 * The column the wire's thread runs down, drawn a line at a time and meeting itself from one line to the next. Every
 * line of the run draws it, so the thread goes unbroken past whatever a line holds.
 */
export function WireRail({ children }: WireRailProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.rail}>
      <Box style={styles.thread} />
      {children}
    </Box>
  );
}
