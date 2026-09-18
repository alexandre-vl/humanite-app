import type { ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { formatDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type ArticleCardProps = Readonly<{ summary: ArticleSummary }>;

const useStyles = createStyles((theme) => ({
  card: { gap: SPACING.xs, padding: SPACING.lg, borderRadius: RADII.md, backgroundColor: theme.card },
}));

/** One article as a feed announces it: its title, the standfirst under it, and the day it appeared. */
export function ArticleCard({ summary }: ArticleCardProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
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
