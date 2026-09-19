import { SPACING } from '@huma/design-tokens';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { EmptyState } from '#components/empty-state';
import { Skeleton } from '#components/skeleton';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import type { FeedOptions } from '../api/queries';
import { ArticleCard, shapeOf } from './article-card';

export type ArticleFeedProps = Readonly<{ query: FeedOptions; header?: ReactNode; sticky?: ReactNode }>;

const useStyles = createStyles(() => ({
  feed: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  item: { paddingTop: SPACING.md },
  standIn: { gap: SPACING.md, padding: SPACING.lg },
  retry: { alignItems: 'center' },
}));

/** Why the feed is showing no article: it has not answered yet, it failed, or it truly holds none. */
type FeedState = 'pending' | 'error' | 'empty';

const stateOf = (isPending: boolean, isError: boolean): FeedState => {
  if (isPending) {
    return 'pending';
  }
  if (isError) {
    return 'error';
  }
  return 'empty';
};

type FeedStandInProps = Readonly<{ state: FeedState; onRetry: () => void }>;

/** What stands in the feed's place: shapes while it loads, a failure worth another try, or an empty shelf. */
function FeedStandIn({ state, onRetry }: FeedStandInProps): ReactNode {
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

/** A paged feed of articles, under the bands its screen supplies, asking for the next page as the end comes near. */
export function ArticleFeed({ query, header, sticky }: ArticleFeedProps): ReactNode {
  const styles = useStyles();
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(query);
  const summaries = data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <List
      items={summaries}
      keyOf={(summary) => summary.id}
      typeOf={shapeOf}
      renderItem={(summary) => (
        <Box style={styles.item}>
          <ArticleCard summary={summary} />
        </Box>
      )}
      contentStyle={styles.feed}
      header={header}
      sticky={sticky}
      empty={
        <FeedStandIn
          state={stateOf(isPending, isError)}
          onRetry={() => {
            void refetch();
          }}
        />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }}
    />
  );
}
