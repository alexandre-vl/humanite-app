import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { EmptyState } from '#components/empty-state';
import { Skeleton } from '#components/skeleton';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import type { FeedState } from '../model/paged-feed';

export type FeedStandInProps = Readonly<{ state: FeedState; onRetry: () => void }>;

const useStyles = createStyles(() => ({
  standIn: { gap: SPACING.md, padding: SPACING.lg },
  retry: { alignItems: 'center' },
}));

/**
 * What stands in a feed's place: shapes while it loads, a failure worth another try, or an empty shelf. Both the card
 * feed and the wire show it, so what a reader is told when nothing arrives does not depend on which screen asked.
 */
export function FeedStandIn({ state, onRetry }: FeedStandInProps): ReactNode {
  const styles = useStyles();
  switch (state) {
    case 'pending':
      return (
        <Box style={styles.standIn}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </Box>
      );
    case 'error':
      return (
        <Box style={styles.standIn}>
          <EmptyState title={t('feed.error.title')} message={t('feed.error.message')} />
          <Box style={styles.retry}>
            <Button label={t('action.retry')} onPress={onRetry} />
          </Box>
        </Box>
      );
    case 'empty':
      return <EmptyState title={t('feed.empty.title')} message={t('feed.empty.message')} />;
  }
}
