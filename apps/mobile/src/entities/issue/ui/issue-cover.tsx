import type { IssueSummary } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { formatDayDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';
import { countLabel } from '../model/count';

export type IssueCoverProps = Readonly<{ issue: IssueSummary }>;

/**
 * The shape a numéro stands in on the shelf, measured on capture 04 as a slot of 363 by 465 pixels. The covers there
 * are photographs of newsprint and vary in height between publications; this paper prints one, so one shape.
 */
const COVER_RATIO = 363 / 465;

const useStyles = createStyles((theme) => ({
  shelved: { width: SIZES.cover, gap: SPACING.xs },
  cover: {
    width: SIZES.cover,
    aspectRatio: COVER_RATIO,
    borderRadius: RADII.sm,
    overflow: 'hidden',
    backgroundColor: theme.primary,
  },
  masthead: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  // The page of the cover is painted rather than left clear: a numéro whose opening item lost its picture would
  // otherwise stand as a hole in the shelf the width of every other cover. It is painted in the paper's red and not
  // in the block ground, because the headline laid over it is white — on the block ground that title measured 1.15
  // to 1, a front page with no words on it for as long as the picture took to arrive.
  page: { flex: 1, backgroundColor: theme.primary },
  picture: { position: 'absolute', top: SPACING.none, bottom: SPACING.none, left: SPACING.none, right: SPACING.none },
  lead: { position: 'absolute', left: SPACING.none, right: SPACING.none, bottom: SPACING.none, padding: SPACING.sm },
}));

/**
 * One numéro as the newsstand stands it: a front page in miniature, and under it what it holds.
 *
 * It is drawn rather than photographed, because there is no photograph of a printed page to show and there never will
 * be — the corpus is fictional and every picture in it is generated. So the cover is made of what a front page is made
 * of: the paper's name, the day it carries, the picture it opened on and the headline over it. Everything comes from
 * the numéro itself; nothing here is a second description of an article.
 *
 * The headline is legible over the picture for the same reason the wire's is: the grounds the corpus paints are dark
 * enough to carry white, which its own table of section grounds holds.
 *
 * The day is read off the opening item rather than off the numéro's own name. The two are the same day — the content
 * gathers a numéro by the day its items were filed on, and the opener is one of them — and the reader of an instant
 * is already written; a second reader taking a bare date would be a second place where a date becomes French.
 */
export function IssueCover({ issue }: IssueCoverProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(issue.opener, 'card');
  return (
    <Box style={styles.shelved}>
      <Box style={styles.cover}>
        <Box style={styles.masthead}>
          <Text variant="display" tone="onPrimary" numberOfLines={1}>
            {t('app.name')}
          </Text>
          <Text variant="caption" tone="onPrimary" numberOfLines={1}>
            {formatDayDate(issue.opener.publishedAt)}
          </Text>
        </Box>
        <Box style={styles.page}>
          {visual === null ? null : (
            <Image
              source={visual.source}
              recyclingKey={issue.id}
              announces={DECORATIVE}
              thumbhash={visual.thumbhash}
              style={styles.picture}
            />
          )}
          <Box style={styles.lead}>
            <Text variant="label" tone="onPrimary" numberOfLines={3}>
              {issue.opener.title}
            </Text>
          </Box>
        </Box>
      </Box>
      <Text variant="caption">{countLabel(issue.count)}</Text>
    </Box>
  );
}
