import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import type { EmptyStateProps } from '#components/empty-state';
import { EmptyState } from '#components/empty-state';
import { Skeleton } from '#components/skeleton';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import type { FeedState } from '../model/paged-feed';

/**
 * What a screen says in place of a feed that holds nothing, when its own words are truer than the paper's.
 *
 * It is the component's own props under another name rather than the same two fields written again: the words are
 * handed on untouched, so a third field added to the stand-in would otherwise have to be added here too, and the
 * screens that pass these words would keep type-checking while dropping it.
 */
export type EmptyWords = EmptyStateProps;

export type FeedStandInProps = Readonly<{
  state: FeedState;
  onRetry: () => void;
  empty?: EmptyWords | undefined;
  error?: EmptyWords | undefined;
}>;

const useStyles = createStyles(() => ({
  standIn: { gap: SPACING.md, padding: SPACING.lg },
  retry: { alignItems: 'center' },
}));

/**
 * What stands in a feed's place: shapes while it loads, a failure worth another try, or an empty shelf. Both the card
 * feed and the wire show it, so what a reader is told when nothing arrives does not depend on which screen asked.
 *
 * Both the empty shelf and the failure can be said in the screen's own words, because only there does the screen know
 * something the stand-in does not: an unpublished paper and a question that matched nothing are both a feed holding
 * nothing, and one article that did not arrive is not the articles, plural, that a feed would be missing.
 */
export function FeedStandIn({ state, onRetry, empty, error }: FeedStandInProps): ReactNode {
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
    case 'error': {
      const words = error ?? { title: t('feed.error.title'), message: t('feed.error.message') };
      return (
        <Box style={styles.standIn}>
          <EmptyState title={words.title} message={words.message} />
          <Box style={styles.retry}>
            <Button label={t('action.retry')} onPress={onRetry} />
          </Box>
        </Box>
      );
    }
    case 'empty': {
      const words = empty ?? { title: t('feed.empty.title'), message: t('feed.empty.message') };
      return <EmptyState title={words.title} message={words.message} />;
    }
  }
}
