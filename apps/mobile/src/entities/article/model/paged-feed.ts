import type { ArticleId, ArticleSummary, ContentErrorCode, Instant } from '@huma/contracts';
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
 * What stands under the last item a feed shows: the next part while it is on its way — named by the day it completes,
 * for a feed read a day at a time — the failure to fetch it, or nothing.
 *
 * It is what a reader who reaches the end is owed, and was owed nothing. The next part was asked for without a word
 * at the foot of the list, and its failure went unsaid: on the iPhone simulator on 25/09/2026 the second step of the
 * wire took 11.3 seconds, and a reader flicking down met the last item with nothing under it for all of them. A part
 * that failed left the reader there for good, the list asking again only once it had grown.
 */
export type FeedFoot =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'coming'; day: Instant | null }>
  | Readonly<{ kind: 'failed'; failure: ContentErrorCode }>;

/** Nothing under the last item: there is no next part, or it is not being fetched. */
const NO_FOOT: FeedFoot = { kind: 'none' };

/**
 * What stands under a feed's last item, read off its query: the next part while it is on its way, the failure to
 * fetch it once it has failed, and nothing otherwise. A part the reader is not near yet is not announced: the list
 * asks for it well before its end, so by the time the foot is in view the part is on its way.
 */
export const footOf = (
  next: Readonly<{ fetching: boolean; failed: boolean; error: Error | null }>,
  day: Instant | null,
): FeedFoot => {
  if (next.fetching) {
    return { kind: 'coming', day };
  }
  return next.failed ? { kind: 'failed', failure: failureOf(next.error) } : NO_FOOT;
};

/**
 * A feed as the view that draws it reads it: what has arrived, what stands in while nothing has, and — when there is
 * more than one page — how to ask for the rest. A feed read in one call answers the first three and leaves the last
 * alone, which is why the view asks for no more than it draws.
 */
export type ReadFeed = Readonly<{
  items: readonly ArticleSummary[];
  state: FeedState;
  /**
   * Reading the feed again, every page it holds from the first: what a pull down the screen asks for, and what a
   * failure offers to try again. The two are one reading, and a feed that named them apart could make them differ.
   */
  readAgain: () => void;
  /** Whether that reading is under way, and only that one: asking for the next page is not a refresh. */
  refreshing: boolean;
  onEndReached?: (() => void) | undefined;
  /** What stands under the last item it shows. */
  foot: FeedFoot;
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
  const {
    data,
    status,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery(query);
  return {
    items: once(data?.pages.flatMap((page) => page.items) ?? []),
    state: stateOf(status, error),
    readAgain: () => {
      void refetch();
    },
    // An infinite query calls itself refetching while it reaches for the next page too, and a spinner at the top of a
    // list the reader has scrolled to the bottom of says nothing true. The page being asked for is what tells the two
    // apart.
    refreshing: isRefetching && !isFetchingNextPage,
    onEndReached: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    foot: footOf({ fetching: isFetchingNextPage, failed: isFetchNextPageError, error }, null),
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
  readAgain: nothing,
  refreshing: false,
  foot: NO_FOOT,
});
