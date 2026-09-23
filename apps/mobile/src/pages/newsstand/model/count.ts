import type { DisplayText, IssueSummary } from '@huma/contracts';
import { counted, t } from '#i18n';
import { formatDayDate } from '#lib/format';

/**
 * How much a numéro holds, in words. The number is written into the sentence by the dictionary rather than glued to it
 * here, so the French and the place the number sits in it stay where the rest of the app's French is.
 */
export const countLabel = (count: number): DisplayText => counted('issue.count', count);

/**
 * What a cover says to a reader listening to the shelf, in one sentence rather than four things in a row.
 *
 * A cover is drawn as a front page, so left to compose itself it would read out the paper's name before every numéro
 * — four times on a shelf of four — and then a date, a headline and a count as separate stops. What a reader wants
 * from a shelf is which numéro this is and whether to open it, which is the date, what it opens on, and how much is
 * in it.
 */
export const coverLabel = (issue: IssueSummary): DisplayText =>
  t('issue.cover', {
    date: formatDayDate(issue.opener.publishedAt),
    opener: issue.opener.title,
    count: countLabel(issue.count),
  });
