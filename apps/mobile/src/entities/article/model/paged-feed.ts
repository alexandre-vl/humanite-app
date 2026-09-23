import type { ArticleId, ArticleSummary } from '@huma/contracts';
import type { QueryStatus } from '@tanstack/react-query';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { keptQuery } from '../api/queries';
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
  /** Reading the feed again from its first page, which is what a pull down the screen asks for. */
  refresh: () => void;
  /** Whether that reading is under way, and only that one: asking for the next page is not a refresh. */
  refreshing: boolean;
  onEndReached?: (() => void) | undefined;
}>;

/**
 * The items of the pages read so far, each once, where it was first read.
 *
 * A list paged by number shifts by one whenever an item is filed between two reads, and the item at the foot of one
 * page comes back at the head of the next. A list drawing the same key twice draws one of them wrong, so the second
 * reading is dropped rather than shown.
 */
const once = (items: readonly ArticleSummary[]): readonly ArticleSummary[] => {
  const seen = new Set<ArticleId>();
  const kept: ArticleSummary[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      kept.push(item);
    }
  }
  return kept;
};

/**
 * Reads a paged feed. Every screen that shows one reads it this way: the pages already fetched, flattened, each item
 * once; one more asked for as the end comes near, and only when one is left to ask for and none is on its way. Written
 * once so no two screens drift on when a reader is told the feed is empty, or on when the next page is asked for.
 *
 * The screen reads it, not the view it hands it to. A view that read its own feed would be the only one to know what
 * it holds, and a screen with something of its own to say about what it shows would have nothing to ask.
 */
export function usePagedFeed(query: PagedFeed): ReadFeed {
  const { data, status, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(query);
  const again = (): void => {
    void refetch();
  };
  return {
    items: once(data?.pages.flatMap((page) => page.items) ?? []),
    state: stateOf(status),
    retry: again,
    refresh: again,
    // An infinite query calls itself refetching while it reaches for the next page too, and a spinner at the top of a
    // list the reader has scrolled to the bottom of says nothing true. The page being asked for is what tells the two
    // apart.
    refreshing: isRefetching && !isFetchingNextPage,
    onEndReached: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
  };
}

/**
 * Reads the articles someone else's list names, in the order it names them, as a feed.
 *
 * A list of none is a feed holding none, not a feed still loading: nothing is asked when there is nothing to ask
 * about, so the answer would never come and the stand-in would turn for ever. There is no next page to reach: the
 * whole list is one call, however long it is.
 */
export function useKeptFeed(ids: readonly ArticleId[]): ReadFeed {
  const { data, status, refetch, isRefetching } = useQuery(keptQuery(ids));
  const again = (): void => {
    void refetch();
  };
  return {
    items: data ?? [],
    state: ids.length === 0 ? 'empty' : stateOf(status),
    retry: again,
    refresh: again,
    refreshing: isRefetching,
  };
}
