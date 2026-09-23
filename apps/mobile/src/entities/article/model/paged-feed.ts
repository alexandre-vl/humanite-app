import type { ArticleId, ArticleSummary, ContentErrorCode } from '@huma/contracts';
import type { QueryStatus } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { failureOf } from '#api';
import type { PagedFeed } from '../api/queries';

/**
 * Why a feed is showing no article: it has not answered yet, it failed — and then for which cause, which decides what
 * the reader is told and whether asking again can help — or it truly holds none.
 */
export type FeedState =
  Readonly<{ kind: 'pending' }> | Readonly<{ kind: 'failed'; failure: ContentErrorCode }> | Readonly<{ kind: 'empty' }>;

/**
 * What stands in a feed's place, for each answer a query can have given. A reading that succeeded and still shows
 * nothing is a feed that holds nothing. The table answers for every status the library declares, so a status added
 * there stops the build here rather than falling through to the wrong stand-in.
 */
const STAND_IN = {
  pending: () => ({ kind: 'pending' }),
  error: (error) => ({ kind: 'failed', failure: failureOf(error) }),
  success: () => ({ kind: 'empty' }),
} as const satisfies Readonly<Record<QueryStatus, (error: Error | null) => FeedState>>;

/** What stands in a feed's place, read off a query's status and the error it failed with, when it did. */
export const stateOf = (status: QueryStatus, error: Error | null): FeedState => STAND_IN[status](error);

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
  const { data, status, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(query);
  const again = (): void => {
    void refetch();
  };
  return {
    items: once(data?.pages.flatMap((page) => page.items) ?? []),
    state: stateOf(status, error),
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

/** What a feed does when asked again for something it already holds whole. */
const nothing = (): void => undefined;

/**
 * A feed of articles a screen already holds, in the order it holds them: nothing to wait for and nothing to ask again,
 * so it stands in only when it holds none. What a reader kept is one — it is drawn from the phone, not from the content.
 */
export const feedOf = (items: readonly ArticleSummary[]): ReadFeed => ({
  items,
  state: { kind: 'empty' },
  retry: nothing,
  refresh: nothing,
  refreshing: false,
});
