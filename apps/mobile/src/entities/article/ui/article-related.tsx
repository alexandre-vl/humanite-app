import type { ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { Paper } from '#components/paper';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Pressable } from '#primitives/pressable';
import { Text } from '#primitives/text';
import { HERO_RATIO } from '../model/picture';

export type ArticleRelatedProps = Readonly<{ summary: ArticleSummary; onOpen: () => void }>;

const useStyles = createStyles((theme) => ({
  block: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  label: { alignItems: 'center' },
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
      <Box style={styles.label}>
        <Text variant="headline" align="center">
          {t('article.related')}
        </Text>
      </Box>
      <Paper>
        <Pressable onPress={onOpen}>
          {visual === null ? null : (
            <Image
              source={visual.source}
              recyclingKey={summary.id}
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
