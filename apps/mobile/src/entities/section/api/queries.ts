import { queryOptions } from '@tanstack/react-query';
import { content } from '#api';

/** The root every section key starts with: one entity, one namespace in the cache the app persists. */
const SECTIONS = 'sections';

/**
 * Every section the newsroom publishes, which the bar shows in the order they carry. It is the paper's own list, not
 * the reader's: nothing a reader does makes it stale, so a screen that comes back to the bar draws it from the cache
 * instead of asking again.
 */
export const sectionsQuery = queryOptions({
  queryKey: [SECTIONS],
  queryFn: async () => content.getSections(),
  staleTime: Infinity,
});
