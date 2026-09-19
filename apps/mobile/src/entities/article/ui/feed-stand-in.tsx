import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { EmptyState } from '#components/empty-state';
import { Skeleton } from '#components/skeleton';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';

/** Why a feed is showing no article: it has not answered yet, it failed, or it truly holds none. */
export type FeedState = 'pending' | 'error' | 'empty';

export const stateOf = (isPending: boolean, isError: boolean): FeedState => {
  if (isPending) {
    return 'pending';
  }
  if (isError) {
    return 'error';
  }
  return 'empty';
};

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
