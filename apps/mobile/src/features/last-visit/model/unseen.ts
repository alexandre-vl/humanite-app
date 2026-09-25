import type { ArticleSummary, Instant } from '@huma/contracts';
import { useVisits } from './store';

/** What the wire holds that it has not shown the reader: how many items, and whether more may lie below them. */
export type Unseen = Readonly<{ count: number; atLeast: boolean }>;

/**
 * What of `items` — the wire's run, newest first — came out after `seen`, the newest item the wire has shown.
 *
 * Nothing on a first visit: everything is new then, and a count of the whole run tells a reader nothing they can use.
 * The count is a floor when every item read so far is newer than `seen`: what came out between the two lies below
 * the run, and cannot be counted without reading it.
 */
export const unseenOf = (items: readonly ArticleSummary[], seen: Instant | null): Unseen | null => {
  if (seen === null) {
    return null;
  }
  const count = items.filter((item) => item.publishedAt > seen).length;
  return count === 0 ? null : { count, atLeast: count === items.length };
};

/** What of `items` the wire has not shown the reader yet, as its store remembers what it showed. */
export const useUnseen = (items: readonly ArticleSummary[]): Unseen | null =>
  unseenOf(
    items,
    useVisits((state) => state.seen),
  );
