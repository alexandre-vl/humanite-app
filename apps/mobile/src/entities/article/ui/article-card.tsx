import type { ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { visualOf } from '#api';
import { formatDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';

export type ArticleCardProps = Readonly<{ summary: ArticleSummary }>;

/** The frame a card crops its picture to, which is the shape the corpus draws them in. */
const HERO_RATIO = 16 / 9;

const useStyles = createStyles((theme) => ({
  card: { gap: SPACING.xs, padding: SPACING.lg, borderRadius: RADII.md, backgroundColor: theme.card },
  hero: {
    alignSelf: 'stretch',
    aspectRatio: HERO_RATIO,
    borderRadius: RADII.sm,
    backgroundColor: theme.border,
    marginBottom: SPACING.xs,
  },
}));

/** One article as a feed announces it: its picture, its title, the standfirst under it, and the day it appeared. */
export function ArticleCard({ summary }: ArticleCardProps): ReactNode {
  const styles = useStyles();
  const visual = summary.hero === undefined ? null : visualOf(summary.hero.key, 'card');
  return (
    <Box style={styles.card}>
      {visual === null ? null : <Image source={visual.source} thumbhash={visual.thumbhash} style={styles.hero} />}
      <Text variant="title" numberOfLines={3}>
        {summary.title}
      </Text>
      <Text variant="standfirst" numberOfLines={3}>
        {summary.standfirst}
      </Text>
      <Text variant="caption">{formatDate(summary.publishedAt)}</Text>
    </Box>
  );
}
