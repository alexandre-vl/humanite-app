import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import type { FeedFooterProps } from './feed-footer';
import { FootComing, FootFailed } from './feed-footer';
import { WireRail } from './wire-rail';

const useStyles = createStyles(() => ({
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  words: { flex: 1, paddingLeft: SPACING.md, paddingVertical: SPACING.lg },
}));

/**
 * What stands under the last row of the wire, hung from its thread as a row is: the day on its way, or the failure to
 * fetch it, where the titles begin.
 *
 * It stood at the edge of the list once, the thread ending over it and its words starting under the thread rather
 * than where every title above them starts (iPhone simulator, 25/09/2026). The thread runs on down to it now: what it
 * says is the next part of the same run.
 */
export function WireFooter({ foot, onRetry }: FeedFooterProps): ReactNode {
  const styles = useStyles();
  if (foot.kind === 'none') {
    return null;
  }
  return (
    <Box style={styles.row}>
      <WireRail />
      <Box style={styles.words}>
        {foot.kind === 'coming' ? (
          <FootComing day={foot.day} />
        ) : (
          <FootFailed failure={foot.failure} onRetry={onRetry} />
        )}
      </Box>
    </Box>
  );
}
