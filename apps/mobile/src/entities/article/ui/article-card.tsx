import type { Access, ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { visualOf } from '#api';
import { Badge } from '#components/badge';
import { t } from '#i18n';
import { formatDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';

export type ArticleCardProps = Readonly<{ summary: ArticleSummary }>;

/** The frame a card crops its picture to, which is the shape the corpus draws them in. */
const HERO_RATIO = 16 / 9;

/**
 * Whether a card tells the reader the item is reserved, access by access. The table answers for every access the
 * contract declares, so an access added there stops the build here rather than travelling the feed unmarked — a
 * silence nothing would report.
 */
const MARKED = { free: false, premium: true } satisfies Readonly<Record<Access, boolean>>;

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

/** One article as a feed announces it: its picture, who may read it, its title, the standfirst, and its date. */
export function ArticleCard({ summary }: ArticleCardProps): ReactNode {
  const styles = useStyles();
  const visual = summary.hero === undefined ? null : visualOf(summary.hero.key, 'card');
  return (
    <Box style={styles.card}>
      {visual === null ? null : <Image source={visual.source} thumbhash={visual.thumbhash} style={styles.hero} />}
      {MARKED[summary.access] ? <Badge label={t('article.premium')} /> : null}
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
