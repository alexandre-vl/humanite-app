import { SPACING } from '@huma/design-tokens';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import type { FeedOptions } from '../api/queries';
import { ArticleCard, shapeOf } from './article-card';
import { FeedStandIn, stateOf } from './feed-stand-in';

export type ArticleFeedProps = Readonly<{ query: FeedOptions; header?: ReactNode; sticky?: ReactNode }>;

const useStyles = createStyles(() => ({
  feed: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  item: { paddingTop: SPACING.md },
}));

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
