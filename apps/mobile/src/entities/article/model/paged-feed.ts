import type { ArticleSummary } from '@huma/contracts';
import type { QueryStatus } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PagedFeed } from '../api/queries';

/** Why a feed is showing no article: it has not answered yet, it failed, or it truly holds none. */
export type FeedState = 'pending' | 'error' | 'empty';

/**
 * What stands in a feed's place, for each answer a query can have given. A reading that succeeded and still shows
 * nothing is a feed that holds nothing. The table answers for every status the library declares, so a status added
 * there stops the build here rather than falling through to the wrong stand-in.
 */
const STAND_IN = {
  pending: 'pending',
  error: 'error',
  success: 'empty',
} as const satisfies Readonly<Record<QueryStatus, FeedState>>;

export const stateOf = (status: QueryStatus): FeedState => STAND_IN[status];

/** A feed read page by page: what has arrived, what stands in while nothing has, and how to ask for the rest. */
export type ReadFeed = Readonly<{
  items: readonly ArticleSummary[];
  state: FeedState;
  retry: () => void;
  onEndReached: () => void;
}>;

/**
 * Reads a paged feed. Both the card feed and the wire read one, and they read it the same way: the pages already
 * fetched, flattened; one more asked for as the end comes near, and only when one is left to ask for and none is on
 * its way. Written once so the two screens cannot drift on when a reader is told the feed is empty, or on when the
 * next page is asked for.
 */
export function usePagedFeed(query: PagedFeed): ReadFeed {
  const { data, status, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(query);
  return {
    items: data?.pages.flatMap((page) => page.items) ?? [],
    state: stateOf(status),
    retry: () => {
      void refetch();
    },
    onEndReached: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
  };
}
