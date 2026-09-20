import type { DisplayText } from '@huma/contracts';
import { PALETTE, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { Visual } from '#api';
import { formatDuration } from '#lib/format';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';

export type ArticleVideoProps = Readonly<{
  title: DisplayText;
  durationSeconds: number;
  poster: Visual | null;
  recyclingKey: string;
}>;

/** The frame the player fills, measured on capture 11 at 954 × 715 points — four to three. */
const PLAYER_RATIO = 4 / 3;

const useStyles = createStyles((theme) => ({
  block: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  player: {
    aspectRatio: PLAYER_RATIO,
    borderRadius: RADII.lg,
    // Black, and named from the palette rather than taken from a theme role: a picture that does not fill its frame is
    // letterboxed in black because that is what letterboxing is, not because a colour scheme decided it. The frame
    // reads the same under both themes, and the capture measures #000000 inside a page whose ground is #141414.
    backgroundColor: PALETTE.black,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poster: { position: 'absolute', top: SPACING.none, bottom: SPACING.none, left: SPACING.none, right: SPACING.none },
  badge: {
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
 * A video of an article, as everything known about it allows: a title and a running time, which is all the contract
 * carries — no source to read, no still of its own. The frame shows the article's own picture behind a play mark, the
 * way the current app shows a video before it is started, with the running time on the mark.
 *
 * Nothing here plays, and no player is installed. A player needs a source and the data has none to give it, so the
 * frame says what is there and how long it runs, and stops where the data stops.
 */
export function ArticleVideo({ title, durationSeconds, poster, recyclingKey }: ArticleVideoProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Box style={styles.block}>
      <Box style={styles.player}>
        {poster === null ? null : (
          <Image
            source={poster.source}
            recyclingKey={recyclingKey}
            thumbhash={poster.thumbhash}
            style={styles.poster}
          />
        )}
        <Box style={styles.badge}>
          <Icon name="play" size={SPACING.md} tintColor={theme.onPrimary} />
          <Text variant="label" tone="onPrimary">
            {formatDuration(durationSeconds)}
          </Text>
        </Box>
      </Box>
      <Text variant="standfirst">{title}</Text>
    </Box>
  );
}
