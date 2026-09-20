import type { IssueId } from '@huma/contracts';
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

/** One numéro, read whole, under a key of its own. The factory is not exported: the reading below is the door. */
const whole = (id: IssueId) =>
  queryOptions({
    queryKey: [ISSUES, id],
    queryFn: async () => content.getIssue(id),
    staleTime: Infinity,
  });

/**
 * One numéro, whole, laid out in the order the newsroom runs its sections.
 *
 * It is one call and has no next page: a day's paper is closed, and asking for it a dozen items at a time would be
 * paging through something that has already stopped growing. Like the shelf it comes off, it never goes stale.
 */
export const issueQuery = (id: IssueId): ReturnType<typeof whole> => whole(id);
