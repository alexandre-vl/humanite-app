import { z } from 'zod';
import { ARTICLE_SUMMARY } from './article.ts';
import { ISSUE_ID } from './ids.ts';

/**
 * A numéro as a shelf of the newsstand shows it: which day it is, what it opened on, and how much it holds.
 *
 * It carries the opening item whole rather than a title and a picture key of its own. A cover is the day's front page,
 * and a front page is an article — so describing one again here would be a second place to say what an article shows,
 * and the two could drift while both stayed valid. The count is the one thing the summary knows that the opener does
 * not, and it is what tells a reader a numéro apart from the one beside it.
 */
export const ISSUE_SUMMARY = z.object({
  id: ISSUE_ID,
  opener: ARTICLE_SUMMARY,
  count: z.number().int().positive(),
});
export type IssueSummary = z.infer<typeof ISSUE_SUMMARY>;
