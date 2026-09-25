import type { ArticleId, ArticleSummary, SectionId } from '@huma/contracts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { streamQuery } from '../api/queries';
import type { ReadFeed } from './paged-feed';
import { footOf, stateOf, useReadAgain } from './paged-feed';
import { floorOf, reachOf, targetOf } from './reach';

/**
 * The articles of every step read so far, each once, newest first.
 *
 * Once, because the same article is filed under one section only but a step reads eleven lists and a reader may have
 * read a step twice. Newest first, because that is the whole claim this screen makes: the paper in the order the
 * newsroom filed it, with nothing standing above something filed after it.
 */
const inOrder = (items: readonly ArticleSummary[]): readonly ArticleSummary[] => {
  const seen = new Set<ArticleId>();
  const kept: ArticleSummary[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      kept.push(item);
    }
  }
  return kept.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
};

/**
 * The whole paper as one running order: every section read down to the same day, merged, each article once, and cut
 * at the line below which the merge cannot yet be vouched for.
 *
 * The cut is the point. Eleven lists read one page deep do not end at the same hour — a section the newsroom runs
 * hard ends three days back, a section it runs rarely two months — so below the newest of those eleven endings there
 * are hours the merge holds only part of. Showing them would put an article on the screen above one filed after it,
 * and would slide that article down the list the moment the next step landed, under the eyes of a reader who had
 * already scrolled past. Held back, the order on the screen is true at every point, and the next step extends it
 * downwards and never rewrites it. Measured on 25/09/2026: one step read 308 articles and could vouch for 102 of
 * them, over three days.
 *
 * What is held back is not thrown away. It is in the cache, it is already merged the moment the next step lands, and
 * it cost nothing the second time.
 *
 * The foot names the day the step on its way completes, which is the day the next head of the run will print.
 */
export function useArticleStream(sections: readonly SectionId[]): ReadFeed {
  const { data, status, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useInfiniteQuery(streamQuery(sections));
  const { readAgain, refreshing } = useReadAgain(refetch);
  const steps = data?.pages ?? [];
  const floor = floorOf(reachOf(steps));
  const read = inOrder(steps.flatMap((step) => step.read));
  return {
    items: floor === null ? read : read.filter((item) => item.publishedAt >= floor),
    // A menu that has not answered yet leaves the reading idle rather than failed, and an idle reading is one that
    // has not answered: the screen waits, which is what it is in fact doing.
    state: sections.length === 0 ? { kind: 'pending' } : stateOf(status, error),
    readAgain,
    refreshing,
    onEndReached: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    foot: footOf(
      { fetching: isFetchingNextPage, failed: isFetchNextPageError, error },
      floor === null ? null : targetOf(floor),
    ),
  };
}
