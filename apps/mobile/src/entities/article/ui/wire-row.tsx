import type { ArticleSummary } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { formatHour } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';
import { accessWord } from '../model/access';
import { formatWord } from '../model/format';
import { ItemWord } from './item-word';

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
 * its title, and under the title whether anyone may read it.
 *
 * The word beside the hour is the one the service knows of every item: a video, a piece of opinion, a chapter of a
 * series, a running coverage. The section an item ran in would say more, and the service says it of no item on the
 * wire; the flag the desk could set on an item it picked out was set on none of 514, so neither has a place here.
 *
 * The mark under the title is the one a card prints at its foot, and it is set where a card sets it: after the title,
 * not beside the word for what the item is, where « Vidéo » and « Accès libre » would run together into one phrase.
 * The wire marked nothing of access while the front marked its cards, so the same item said one thing on one screen
 * and nothing on the next.
 *
 * The title is set in the type the paper reads in, at one size for every row, and whole: it was cut at four lines,
 * and a headline is cut on no list of the paper. A wire has no desk behind it — what is at the top is at the top
 * because it is the newest — so nothing on this screen is printed larger than anything else.
 */
export function WireRow({ summary }: WireRowProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      <Box style={styles.rail}>
        <Box style={styles.rule} />
        <Box style={styles.ring} />
      </Box>
      <Box style={styles.words}>
        <Box style={styles.said}>
          <Text variant="caption">{formatHour(summary.publishedAt)}</Text>
          <ItemWord word={formatWord(summary.format)} />
        </Box>
        <Text variant="body">{summary.title}</Text>
        <ItemWord word={accessWord(summary.access)} />
      </Box>
    </Box>
  );
}
