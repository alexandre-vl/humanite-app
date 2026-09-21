import type { ArticleSummary } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { Paper } from '#components/paper';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Pressable } from '#primitives/pressable';
import { Text } from '#primitives/text';
import { HERO_RATIO } from '../model/picture';

export type ArticleRelatedProps = Readonly<{ summary: ArticleSummary; onOpen: () => void }>;

const useStyles = createStyles((theme) => ({
  block: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  // A line across the column and the word under it: what divides a body from what it points at is a rule, which is
  // how all three of the papers that print one divide anything. It was a centred headline in the paper's red — a
  // label announcing another article, set louder than the article one was reading.
  rule: { height: SIZES.stroke, backgroundColor: theme.rule },
  picture: { alignSelf: 'stretch', aspectRatio: HERO_RATIO, borderRadius: RADII.sm, backgroundColor: theme.border },
}));

/**
 * The article a body sends the reader to next, announced on a piece of paper of its own.
 *
 * The current app prints the caption and the credit of the linked picture above its title, and in the style of a
 * title, so that what one reads first is the photographer rather than the article (README:430, listed there as a
 * fault). Here the title comes first and the standfirst under it, which is the order the words are worth.
 */
export function ArticleRelated({ summary, onOpen }: ArticleRelatedProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'card');
  return (
    <Box style={styles.block}>
      <Box style={styles.rule} />
      <Text variant="kicker" heading>
        {t('article.related')}
      </Text>
      <Paper>
        <Pressable role="link" onPress={onOpen}>
          {visual === null ? null : (
            <Image
              source={visual.source}
              recyclingKey={summary.id}
              announces={DECORATIVE}
              thumbhash={visual.thumbhash}
              style={styles.picture}
            />
          )}
          <Text variant="title" numberOfLines={3}>
            {summary.title}
          </Text>
          <Text variant="prose" numberOfLines={2}>
            {summary.standfirst}
          </Text>
        </Pressable>
      </Paper>
    </Box>
  );
}
