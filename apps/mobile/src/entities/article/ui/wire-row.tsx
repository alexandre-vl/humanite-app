import type { ArticleSummary, DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { formatClockTime } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type WireRowProps = Readonly<{
  summary: ArticleSummary;
  /** What the newsroom calls the section this ran in, or nothing while the list of sections has not arrived. */
  name: DisplayText | null;
}>;

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
  marked: {
    width: SPACING.sm,
    height: SPACING.sm,
    marginTop: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: SIZES.stroke,
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  words: { flex: 1, paddingLeft: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.xs },
  said: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // The section gives way first: it is the one part of the line whose length the newsroom decides, and at the largest
  // step a reader can set, the longest of the paper's section names would push the rest off the screen.
  section: { flexShrink: 1 },
}));

/**
 * One item as the wire lists it: the hour it was filed, the bead it hangs from, what it is about, and its title.
 *
 * The hour and the title are not enough, and the two things they leave out are the two a reader needs. The first is
 * the subject: every section runs down one column here, in the order things happened rather than by desk, and a row
 * with no section gives no way of telling a book review from a strike. The second is what the paper marked. The
 * newsroom marks some items, and the screen this replaces prints those titles in bold and the rest plain, with nothing
 * anywhere saying what the bold means — a question the reference document asks out loud and leaves open. A weight
 * cannot answer it. A word can, so the marked ones carry one, in the ink the titles are set in and beside a bead
 * filled with the paper's red: two things, neither of them a colour on its own.
 *
 * The title is set in the type the paper reads in, at one size for every row. A wire has no desk behind it — what is
 * at the top is at the top because it is the newest — so nothing on this screen is printed larger than anything else.
 */
export function WireRow({ summary, name }: WireRowProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      <Box style={styles.rail}>
        <Box style={styles.rule} />
        <Box style={summary.emphasis === true ? styles.marked : styles.ring} />
      </Box>
      <Box style={styles.words}>
        <Box style={styles.said}>
          <Text variant="caption">{formatClockTime(summary.publishedAt)}</Text>
          {summary.emphasis === true ? (
            <Text variant="kicker" tone="textPrimary">
              {t('wire.marked')}
            </Text>
          ) : null}
          {name === null ? null : (
            <Box style={styles.section}>
              <Text variant="kicker" numberOfLines={1}>
                {name}
              </Text>
            </Box>
          )}
        </Box>
        <Text variant="body" numberOfLines={4}>
          {summary.title}
        </Text>
      </Box>
    </Box>
  );
}
