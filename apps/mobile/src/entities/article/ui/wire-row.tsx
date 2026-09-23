import type { ArticleSummary } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { formatClockTime } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';
import { formatWord } from '../model/format';

export type WireRowProps = Readonly<{ summary: ArticleSummary }>;

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  // The rail is a column the width of a bead, not a column the width of a date. It held the hour beside it — the day
  // and the hour, under a band naming the day — and between the two the words began 140 points into a 411-point
  // screen. They begin 40 points in now, which is 40 % more line for the same title.
  rail: { width: SPACING.md, alignSelf: 'stretch', alignItems: 'center' },
  rule: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    borderLeftWidth: SIZES.stroke,
    borderStyle: 'dashed',
    borderColor: theme.rule,
  },
  // The bead hangs level with the line that names the item, not with the title under it: a row is read from its hour,
  // and the thread runs through the hours.
  ring: {
    width: SPACING.sm,
    height: SPACING.sm,
    marginTop: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: SIZES.stroke,
    borderColor: theme.textMuted,
    backgroundColor: theme.background,
  },
  words: { flex: 1, paddingLeft: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.xs },
  said: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
}));

/**
 * One item as the wire lists it: the hour it was filed, the bead it hangs from, what it is when it is not an article,
 * and its title.
 *
 * The word beside the hour is the one the service knows of every item: a video, a piece of opinion, a chapter of a
 * series, a running coverage. The section an item ran in would say more, and the service says it of no item on the
 * wire; the flag the desk could set on an item it picked out was set on none of 514, so neither has a place here.
 *
 * The title is set in the type the paper reads in, at one size for every row. A wire has no desk behind it — what is
 * at the top is at the top because it is the newest — so nothing on this screen is printed larger than anything else.
 */
export function WireRow({ summary }: WireRowProps): ReactNode {
  const styles = useStyles();
  const word = formatWord(summary.format);
  return (
    <Box style={styles.row}>
      <Box style={styles.rail}>
        <Box style={styles.rule} />
        <Box style={styles.ring} />
      </Box>
      <Box style={styles.words}>
        <Box style={styles.said}>
          <Text variant="caption">{formatClockTime(summary.publishedAt)}</Text>
          {word === null ? null : (
            <Text variant="kicker" tone="textPrimary">
              {word}
            </Text>
          )}
        </Box>
        <Text variant="body" numberOfLines={4}>
          {summary.title}
        </Text>
      </Box>
    </Box>
  );
}
