import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { Visual } from '#api';
import { DECORATIVE } from '#lib/announce';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';
import { LEAD_RATIO } from '../model/picture';

export type ArticleFigureProps = Readonly<{
  visual: Visual;
  recyclingKey: string;
  caption?: DisplayText | undefined;
  credit?: DisplayText | undefined;
}>;

const useStyles = createStyles((theme) => ({
  figure: { gap: SPACING.sm },
  picture: { alignSelf: 'stretch', aspectRatio: LEAD_RATIO, backgroundColor: theme.border },
  words: { gap: SPACING.xs, paddingHorizontal: SPACING.lg },
}));

/**
 * A picture inside an article, with what is written under it. The picture runs edge to edge while the words keep the
 * column's margins, which is how the current app sets them: only the words are read, so only they need a measure.
 *
 * The journal leaves both words out often enough — a third of its pictures come with no caption, and none with a
 * credit of its own — that neither is assumed. With neither, nothing is laid under the picture at all, not even the
 * space the words would have taken.
 */
export function ArticleFigure({ visual, recyclingKey, caption, credit }: ArticleFigureProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.figure}>
      {/* The legend under it is the picture's own words, read out as text: announced again here, it would be read twice. */}
      <Image
        source={visual.source}
        recyclingKey={recyclingKey}
        announces={DECORATIVE}
        thumbhash={visual.thumbhash}
        style={styles.picture}
      />
      {caption === undefined && credit === undefined ? null : (
        <Box style={styles.words}>
          {caption === undefined ? null : <Text variant="legend">{caption}</Text>}
          {/* Quieter than the caption it follows. The two were set in the very same type, so a sentence describing a
              picture and the name of whoever took it read as one paragraph of two sentences. */}
          {credit === undefined ? null : (
            <Text variant="legend" tone="textMuted">
              {credit}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
