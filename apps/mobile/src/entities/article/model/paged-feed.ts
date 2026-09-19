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

/**
 * A feed as the view that draws it reads it: what has arrived, what stands in while nothing has, and — when there is
 * more than one page — how to ask for the rest. A feed read in one call answers the first three and leaves the last
 * alone, which is why the view asks for no more than it draws.
 */
export type ReadFeed = Readonly<{
  items: readonly ArticleSummary[];
  state: FeedState;
  retry: () => void;
  onEndReached?: (() => void) | undefined;
}>;

/**
 * A paged feed, which also knows how many there are in all. The count is the whole feed's and not the pages read so
 * far, because that is the only one worth telling a reader: a screen that filters says what it found, not what it has
 * got as far as showing. It stays out of what a view reads, no view having ever had anything to say about it.
 */
export type PagedRead = ReadFeed & Readonly<{ total: number }>;

/**
 * Reads a paged feed. Every screen that shows one reads it this way: the pages already fetched, flattened; one more
 * asked for as the end comes near, and only when one is left to ask for and none is on its way. Written once so no two
 * screens drift on when a reader is told the feed is empty, or on when the next page is asked for.
 *
 * The screen reads it, not the view it hands it to. A view that read its own feed would be the only one to know what
 * it holds, and a screen with something of its own to say about what it shows would have nothing to ask.
 */
export function usePagedFeed(query: PagedFeed): PagedRead {
  const { data, status, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(query);
  return {
    items: data?.pages.flatMap((page) => page.items) ?? [],
    total: data?.pages[0]?.total ?? 0,
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
