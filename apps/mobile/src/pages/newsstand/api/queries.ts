import { queryOptions } from '@tanstack/react-query';
import { content } from '#api';

/** The root every issue key starts with: one entity, one namespace in the cache the app persists. */
const ISSUES = 'issues';

/**
 * Every numéro the paper has published, the most recent first.
 *
 * It is the paper's own shelf, not the reader's: nothing a reader does makes it stale, so a reader coming back to the
 * newsstand draws it from the cache rather than asking again. A numéro is added the day it is printed, which is not
 * something this app can watch happen.
 */
export const issuesQuery = queryOptions({
  queryKey: [ISSUES],
  queryFn: async () => content.getIssues(),
  staleTime: Infinity,
});

// What a numéro holds is not asked for here any more. It was, for a sommaire screen this app no longer pushes: a
// numéro is read on the paper's own site now, so the only thing the app asks the content for is the shelf.
