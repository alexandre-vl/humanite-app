import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';

const useStyles = createStyles((theme) => ({
  card: { gap: SPACING.sm },
  line: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.card },
}));

/** Muted placeholder lines that stand in for text while content loads. */
export function Skeleton(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
      <Box style={styles.line} />
      <Box style={styles.line} />
      <Box style={styles.line} />
    </Box>
  );
}
