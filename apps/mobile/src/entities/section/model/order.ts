import type { Section } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { sectionsQuery } from '../api/queries';

/**
 * The sections the newsroom publishes, in the order it runs them down the paper.
 *
 * The order is the newsroom's and not the cache's: the sections come back under their own numbering, and a paper
 * whose sections rearranged themselves by the order an answer happened to arrive in would not be the same paper
 * twice. `.sort` rather than `.toSorted`, which Hermes V1 lacks; the copy keeps the cached array untouched.
 */
export const useSections = (): readonly Section[] => {
  const published = useQuery(sectionsQuery).data;
  return [...(published ?? [])].sort((left, right) => left.order - right.order);
};
