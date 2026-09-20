import type { ArticleSummary } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { formatDateTime } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type WireRowProps = Readonly<{ summary: ArticleSummary }>;

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.lg },
  time: { paddingVertical: SPACING.md },
  rail: { alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: SPACING.lg },
  rule: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    borderLeftWidth: SIZES.stroke,
    borderStyle: 'dashed',
    borderColor: theme.onPrimary,
  },
  ring: {
    width: SPACING.md,
    height: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: SIZES.stroke,
    borderColor: theme.onPrimary,
  },
  title: { flex: 1, paddingVertical: SPACING.md },
}));

/**
 * One item as the wire lists it: the hour it was filed, the ring it hangs from, and its title. Nothing else — no
 * picture, no mark, no standfirst, no byline, no section.
 *
 * The hour is printed whole, day included, rather than as a span of time gone by: it is the same eleven characters on
 * every row, so the titles line up, and a reader coming back to a wire read hours ago is told when something happened
 * rather than how long it has been since they last looked.
 *
 * An emphasised title takes the bold face at the same size as a plain one, which is the paper's own way of marking a
 * wire item. The rule runs the whole height of the row and the ring hangs on it beside the first line of the title;
 * both are drawn per row rather than once for the list, a recycled cell knowing only itself.
 */
export function WireRow({ summary }: WireRowProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      <Box style={styles.time}>
        <Text variant="caption" tone="onPrimary">
          {formatDateTime(summary.publishedAt)}
        </Text>
      </Box>
      <Box style={styles.rail}>
        <Box style={styles.rule} />
        <Box style={styles.ring} />
      </Box>
      <Box style={styles.title}>
        <Text variant={summary.emphasis === true ? 'standfirst' : 'body'} tone="onPrimary">
          {summary.title}
        </Text>
      </Box>
    </Box>
  );
}
