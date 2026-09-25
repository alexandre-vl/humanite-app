import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { Visual } from '#api';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Image } from '#primitives/image';
import { Pressable } from '#primitives/pressable';
import { Text } from '#primitives/text';
import { FRAMES } from '../model/picture';

export type ArticleFilmProps = Readonly<{
  poster: Visual | null;
  recyclingKey: string;
  /** What pressing the film does — opening it where it lives — or nothing, for an item that links to no film. */
  onPlay: (() => void) | null;
}>;

const useStyles = createStyles((theme) => ({
  frame: {
    alignSelf: 'stretch',
    aspectRatio: FRAMES.film,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    backgroundColor: theme.standIn,
  },
  poster: { position: 'absolute', top: SPACING.none, bottom: SPACING.none, left: SPACING.none, right: SPACING.none },
  badge: {
    margin: SPACING.lg,
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    backgroundColor: theme.primary,
  },
}));

/**
 * The film of a video article: its still, in the film's own shape, and the way to it.
 *
 * The journal keeps its films on YouTube and sends no running time with them, and the app plays none itself: the
 * official app opens the film on YouTube, and a player of the app's own would make it a client of YouTube's, with the
 * obligations that go with one. So the still is the article's own picture, the mark on it says where a press leads —
 * out of the app, to YouTube — and the press opens the film there. An item that links to no film shows its still and
 * nothing to press.
 */
export function ArticleFilm({ poster, recyclingKey, onPlay }: ArticleFilmProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const frame = (
    <Box style={styles.frame}>
      {poster === null ? null : (
        <Image
          source={poster.source}
          recyclingKey={recyclingKey}
          announces={DECORATIVE}
          thumbhash={poster.thumbhash}
          style={styles.poster}
        />
      )}
      {onPlay === null ? null : (
        <Box style={styles.badge}>
          <Icon name="play" announces={DECORATIVE} size={SPACING.md} tintColor={theme.onPrimary} />
          <Text variant="label" tone="onPrimary">
            {t('article.film')}
          </Text>
        </Box>
      )}
    </Box>
  );
  return onPlay === null ? (
    frame
  ) : (
    <Pressable role="link" onPress={onPlay}>
      {frame}
    </Pressable>
  );
}
