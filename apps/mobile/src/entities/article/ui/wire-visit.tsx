import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';
import { WireRail } from './wire-rail';

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  words: { flex: 1, paddingLeft: SPACING.md, paddingTop: SPACING.md, gap: SPACING.sm },
  line: { height: SIZES.stroke, backgroundColor: theme.primary },
}));

/**
 * The line across the wire under which everything was already out at the reader's last visit, and the words that say
 * so, heading what follows as a day's head heads its run.
 *
 * It is drawn in the paper's red, as the head of a day is: both mark a place in time on a list ordered by it, and
 * nothing else on the wire is red. The words themselves are in the ink, the red being proven as a letter at no size
 * this small; and they say what lies under the line rather than what lies over it, the items over it being the ones
 * a reader has just read past.
 */
export function WireVisit(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      <WireRail />
      <Box style={styles.words}>
        <Box style={styles.line} />
        <Text variant="kicker" heading>
          {t('live.visit')}
        </Text>
      </Box>
    </Box>
  );
}
