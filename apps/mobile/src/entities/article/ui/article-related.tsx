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
import { frameOf } from '../model/format';
import { FRAMES } from '../model/picture';

export type ArticleRelatedProps = Readonly<{ summary: ArticleSummary; onOpen: () => void }>;

const useStyles = createStyles((theme) => ({
  block: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  // A line across the column and the word under it: what divides a body from what it points at is a rule, which is
  // how all three of the papers that print one divide anything. It was a centred headline in the paper's red — a
  // label announcing another article, set louder than the article one was reading.
  rule: { height: SIZES.stroke, backgroundColor: theme.rule },
  // The card's own parts, set apart by the card itself. A torn sheet of paper spaces the things laid on it, and
  // exactly one thing was laid on this one — the target holding all three — so the sheet spaced nothing: the title
  // sat twenty-two pixels inside the picture above it and the sentence twenty-two inside the title. Measured on an
  // A065: picture `[74,1401][998,1936]`, title `[87,1914][1003,2119]`, standfirst `[91,2097][1006,2255]`.
  card: { gap: SPACING.sm },
  // The title and the sentence answering it are a pair, and are set nearer to each other than to the picture — the
  // same three distances a card of the feed is set at, because this is a card of the feed laid on a torn sheet.
  words: { gap: SPACING.xs },
  photo: { alignSelf: 'stretch', aspectRatio: FRAMES.photo, borderRadius: RADII.sm, backgroundColor: theme.border },
  film: { alignSelf: 'stretch', aspectRatio: FRAMES.film, borderRadius: RADII.sm, backgroundColor: theme.border },
}));

/**
 * The article a body sends the reader to next, announced on a piece of paper of its own.
 *
 * The current app prints the caption and the credit of the linked picture above its title, and in the style of a
 * title, so that what one reads first is the photographer rather than the article (README:430, listed there as a
 * fault). Here the title comes first and the standfirst under it, which is the order the words are worth.
 *
 * The three parts are spaced by the target that holds them and not by the sheet under it. A sheet spaces its own
 * children, and a card whose parts all live inside one pressable hands it a single child to space — which is no
 * spacing at all. The callout next door lays its three parts on the sheet directly and never showed it.
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
        <Pressable style={styles.card} role="link" onPress={onOpen}>
          {visual === null ? null : (
            <Image
              source={visual.source}
              recyclingKey={summary.id}
              announces={DECORATIVE}
              thumbhash={visual.thumbhash}
              style={styles[frameOf(summary.format)]}
            />
          )}
          <Box style={styles.words}>
            <Text variant="title" numberOfLines={3}>
              {summary.title}
            </Text>
            <Text variant="prose" numberOfLines={2}>
              {summary.standfirst}
            </Text>
          </Box>
        </Pressable>
      </Paper>
    </Box>
  );
}
