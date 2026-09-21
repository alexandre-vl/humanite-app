import type { ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { DECORATIVE } from '#lib/announce';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';
import { HERO_RATIO } from '../model/picture';

export type WireHeroProps = Readonly<{ summary: ArticleSummary }>;

const useStyles = createStyles((theme) => ({
  frame: {
    alignSelf: 'stretch',
    aspectRatio: HERO_RATIO,
    borderRadius: RADII.sm,
    overflow: 'hidden',
    backgroundColor: theme.primary,
  },
  picture: { position: 'absolute', top: SPACING.none, bottom: SPACING.none, left: SPACING.none, right: SPACING.none },
  caption: { position: 'absolute', left: SPACING.none, right: SPACING.none, bottom: SPACING.none, padding: SPACING.md },
}));

/**
 * The picture the wire opens on, with its title laid over the foot of it.
 *
 * The title is legible on the picture because the pictures are drawn, not photographed: every section ground the
 * corpus generator paints is dark enough to carry a white headline, which its own table of grounds holds. A photograph
 * dropped in later would not owe that, and the reference itself lists the white-on-photograph title among the frictions
 * of the screen it copies.
 */
export function WireHero({ summary }: WireHeroProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'lead');
  return (
    <Box style={styles.frame}>
      {visual === null ? null : (
        <Image
          source={visual.source}
          recyclingKey={summary.id}
          announces={DECORATIVE}
          thumbhash={visual.thumbhash}
          style={styles.picture}
        />
      )}
      <Box style={styles.caption}>
        <Text variant="display" tone="onPrimary" numberOfLines={3}>
          {summary.title}
        </Text>
      </Box>
    </Box>
  );
}
