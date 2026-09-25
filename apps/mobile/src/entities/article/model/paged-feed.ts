import type { ArticleSummary, ContentErrorCode, Instant } from '@huma/contracts';
import type { QueryStatus } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { failureOf } from '#api';
import { onceEach } from '#lib/once';
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
  /**
   * Whether a reading the reader asked for is under way, and only such a reading: asking for the next page is not a
   * refresh, and neither is the reading the library makes by itself of a page gone stale.
   */
  refreshing: boolean;
  onEndReached?: (() => void) | undefined;
  /** What stands under the last item it shows. */
  foot: FeedFoot;
}>;

/**
 * Reading a feed again because the reader asked — by pulling the list down, or by trying again after a failure — and
 * whether any such reading is still under way.
 *
 * The spinner a pulled list shows is the platform's own, and it was told to turn whenever the feed was being read
 * again for any reason. The library reads a page again by itself whenever the app comes back to the front with a page
 * older than a minute, on every list the app holds, the tabs behind the one in front included: the reader who had
 * pulled nothing found the spinner turning at the top of the wire on coming back to the app, for as long as every page
 * the wire held took to read again, and on a wire read deep it stayed there minutes on end (iPhone simulator,
 * 25/09/2026). It turns now for what the reader asked for, and for as long as that takes.
 *
 * Counted rather than flagged: a second pull before the first is answered sets a second reading going and ends the
 * first, and the spinner stops with the last of them, not the first.
 */
export function useReadAgain(
  refetch: () => Promise<unknown>,
): Readonly<{ readAgain: () => void; refreshing: boolean }> {
  const [asked, setAsked] = useState(0);
  return {
    readAgain: () => {
      setAsked((under) => under + 1);
      void refetch().finally(() => {
        setAsked((under) => under - 1);
      });
    },
    refreshing: asked > 0,
  };
}

/**
 * The items of the pages read so far, each once, where it was first read.
 *
 * A list paged by number shifts by one whenever an item is filed between two reads, and the item at the foot of one
 * page comes back at the head of the next. A list drawing the same key twice draws one of them wrong, so the second
 * reading is dropped rather than shown.
 */
const once = (items: readonly ArticleSummary[]): readonly ArticleSummary[] => onceEach(items, (item) => item.id);

/**
 * Reads a paged feed. Every screen that shows one reads it this way: the pages already fetched, flattened, each item
 * once; one more asked for as the end comes near, and only when one is left to ask for and none is on its way. Written
 * once so no two screens drift on when a reader is told the feed is empty, or on when the next page is asked for.
 *
 * The screen reads it, not the view it hands it to. A view that read its own feed would be the only one to know what
 * it holds, and a screen with something of its own to say about what it shows would have nothing to ask.
 */
export function usePagedFeed(query: PagedFeed): ReadFeed {
  const { data, status, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useInfiniteQuery(query);
  const { readAgain, refreshing } = useReadAgain(refetch);
  return {
    items: once(data?.pages.flatMap((page) => page.items) ?? []),
    state: stateOf(status, error),
    readAgain,
    refreshing,
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

/**
 * Articles a screen already holds, standing in for a feed that has shown none: while the feed is asked, and after it
 * answered, when it answered nothing or failed. A failure is said under them by its cause, with the try again that
 * asks the feed once more; a pull down the list asks the feed too, what stands in having nothing of its own to fetch.
 */
export const feedInPlaceOf = (items: readonly ArticleSummary[], asked: ReadFeed): ReadFeed => ({
  items,
  state: { kind: 'empty' },
  readAgain: asked.readAgain,
  refreshing: asked.refreshing,
  foot: asked.state.kind === 'failed' ? { kind: 'failed', failure: asked.state.failure } : NO_FOOT,
});
