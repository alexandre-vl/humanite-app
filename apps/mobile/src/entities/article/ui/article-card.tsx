import type { Access, ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Badge } from '#components/badge';
import { t } from '#i18n';
import { formatDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';
import { HERO_RATIO, pictureOf } from '../model/picture';

export type ArticleCardProps = Readonly<{ summary: ArticleSummary; action?: ReactNode | undefined }>;

/**
 * Whether a card tells the reader the item is reserved, access by access. The table answers for every access the
 * contract declares, so an access added there stops the build here rather than travelling the feed unmarked — a
 * silence nothing would report.
 */
const MARKED = { free: false, premium: true } satisfies Readonly<Record<Access, boolean>>;

/** The trees a card mounts, one name per branch the render below takes. */
export type CardShape = 'picture' | 'pictureMarked' | 'text' | 'textMarked';

/**
 * Which tree a card mounts for an item. A list hands a cell to another item only when both answer the same shape, and
 * averages measured heights shape by shape — so this names what is rendered, never what the item editorially is:
 * naming the six kinds the corpus distinguishes would split cells that mount the very same tree into six pools that
 * never meet, and buy nothing for the two heights they actually take.
 */
export const shapeOf = (summary: ArticleSummary): CardShape => {
  const marked = MARKED[summary.access];
  if (pictureOf(summary, 'card') === null) {
    return marked ? 'textMarked' : 'text';
  }
  return marked ? 'pictureMarked' : 'picture';
};

const useStyles = createStyles((theme) => ({
  card: { gap: SPACING.xs, padding: SPACING.lg, borderRadius: RADII.md, backgroundColor: theme.card },
  hero: {
    alignSelf: 'stretch',
    aspectRatio: HERO_RATIO,
    borderRadius: RADII.sm,
    backgroundColor: theme.border,
    marginBottom: SPACING.xs,
  },
  // The date and whatever the screen does to the article share the last line, one at each end. A card that had it at
  // one corner of its picture would lose it on the cards that carry none, and put it on the picture itself, where the
  // screen it copies draws it in a colour that holds against a photograph but not against a dark ground.
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));

/**
 * One article as a feed announces it: its picture, who may read it, its title, the standfirst, and its date.
 *
 * `action` is whatever the screen lets a reader do to the article from the feed. The card takes it already made: an
 * entity may not name a route nor hold an action of its own, and the screen that mounts the feed is the one that knows
 * what doing anything to an article means there.
 */
export function ArticleCard({ summary, action }: ArticleCardProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'card');
  return (
    <Box style={styles.card}>
      {visual === null ? null : (
        <Image source={visual.source} recyclingKey={summary.id} thumbhash={visual.thumbhash} style={styles.hero} />
      )}
      {MARKED[summary.access] ? <Badge label={t('article.premium')} /> : null}
      <Text variant="title" numberOfLines={3}>
        {summary.title}
      </Text>
      <Text variant="standfirst" numberOfLines={3}>
        {summary.standfirst}
      </Text>
      <Box style={styles.footer}>
        <Text variant="caption">{formatDate(summary.publishedAt)}</Text>
        {action}
      </Box>
    </Box>
  );
}
