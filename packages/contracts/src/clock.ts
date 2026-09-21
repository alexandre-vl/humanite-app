import type { IssueId } from './ids.ts';
import { ISSUE_ID } from './ids.ts';

/**
 * The zone the newsroom keeps, and the one reading of an instant that everything downstream shares.
 *
 * It is written here and nowhere else because it is a fact about the paper, not about a screen: a stamp in the corpus
 * is a Paris hour, a numéro is a Paris day, and a wire heads its runs by the Paris calendar. Each of those is computed
 * somewhere different — the corpus is built by a generator, the numéros by the content door, the runs by a screen —
 * and a zone spelt out in three places is three places one could be changed without the others.
 */
export const NEWSROOM_ZONE = 'Europe/Paris';

/** The newsroom's calendar, which answers only the day: the other readings of an instant belong where they are shown. */
const NEWSROOM_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: NEWSROOM_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The numéro an instant belongs to: `2026-09-13`.
 *
 * `ISSUE_ID` says of itself that it is the same key a wire groups its runs under, one instant belonging to exactly one
 * issue — and until this existed, two packages each computed it from a clock of their own, agreeing by luck. This is
 * the one place that answers, and it answers with the brand rather than with a string, so nothing downstream can mint
 * a day the shape of an issue without being one.
 *
 * An instant nothing can read is refused rather than turned into a day: `Date.parse` gives it up, the formatter throws
 * on what it is handed, and a run of items would rather stop than be filed under a numéro that does not exist.
 */
export const issueIdAt = (instant: string): IssueId => {
  const parts = new Map(
    NEWSROOM_DAY.formatToParts(Date.parse(instant)).map((part): readonly [string, string] => [part.type, part.value]),
  );
  const read = (type: string): string => parts.get(type) ?? '';
  return ISSUE_ID.parse(`${read('year')}-${read('month')}-${read('day')}`);
};
