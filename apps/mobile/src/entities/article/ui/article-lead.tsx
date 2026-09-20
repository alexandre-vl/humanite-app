import type { Article, DisplayText } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { formatDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

import { ArticleFigure } from './article-figure';

export type ArticleTitleProps = Readonly<{ title: DisplayText }>;
export type ArticleLeadProps = Readonly<{ article: Article; byline: DisplayText | null }>;

const useStyles = createStyles((theme) => ({
  title: { padding: SPACING.xl },
  standfirst: { paddingHorizontal: SPACING.lg },
  meta: { gap: SPACING.xs, paddingHorizontal: SPACING.lg },
  rule: { height: SIZES.stroke, marginHorizontal: SPACING.lg, backgroundColor: theme.border },
}));

/**
 * An article's headline. It sits on the ground rather than on the sheet the article is printed on, centred, in the
 * colour the theme gives a headline — red on the light template, white on the dark one (captures 11 and 13).
 */
export function ArticleTitle({ title }: ArticleTitleProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.title}>
      <Text variant="headline" align="center">
        {title}
      </Text>
    </Box>
  );
}

/**
 * What comes before the body: the standfirst, the picture and what is written under it, then who signed and when,
 * closed by a rule — the order the current app sets them in (captures 13 and 14). Only the words keep the column's
 * margins; the picture runs to both edges of the sheet.
 *
 * A video article shows no picture here. Its first block is the video, which has no still of its own and shows the
 * article's picture instead; showing it twice, once above the player and once inside it, would say nothing more.
 *
 * Nothing marks a reserved article. The content serves its body whole whatever the reader holds, no capture of the
 * current app shows a wall, and a mark over an article one is reading in full would only puzzle.
 */
export function ArticleLead({ article, byline }: ArticleLeadProps): ReactNode {
  const styles = useStyles();
  const hero = article.hero;
  const visual = article.format === 'video' ? null : pictureOf(article, 'lead');
  return (
    <>
      <Box style={styles.standfirst}>
        <Text variant="standfirst">{article.standfirst}</Text>
      </Box>
      {visual === null || hero === undefined ? null : (
        <ArticleFigure visual={visual} recyclingKey={article.id} caption={hero.caption} credit={hero.credit} />
      )}
      <Box style={styles.meta}>
        {byline === null ? null : <Text>{byline}</Text>}
        <Text variant="caption">{formatDate(article.publishedAt)}</Text>
      </Box>
      <Box style={styles.rule} />
    </>
  );
}
