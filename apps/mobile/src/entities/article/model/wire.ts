import type { ArticleSummary, DisplayText, IssueId } from '@huma/contracts';
import { issueIdAt } from '@huma/contracts';
import { formatDayLabel } from '#lib/format';

/** One line of the wire: the head of a day, or an item filed on that day. */
export type WireRow =
  Readonly<{ kind: 'day'; day: IssueId; label: DisplayText }> | Readonly<{ kind: 'item'; summary: ArticleSummary }>;

/**
 * The lines the wire shows, in order: every item under the head of the day it was published on, newest first.
 *
 * It opened on the newest illustrated item, printed the width of the screen with its title laid over the photograph —
 * a card of the front page, in other words, on the one screen of the paper that has no front page. A wire is what the
 * newsroom filed in the order it filed it, and the item at the top is at the top because it is the newest, not because
 * anybody chose it; giving one of twenty-four items 560 pixels of a 2412-pixel screen says the opposite. The reference
 * document lists that treatment among the frictions of the screen this replaces, for a third reason again: a white
 * title is legible over a picture or it is not, depending on the picture.
 *
 * The wire arrives newest first, so a day ends exactly where the next begins and a single pass finds every run —
 * which is as well, Hermes having no `Object.groupBy`. Days are told apart by the newsroom's calendar, not by the
 * reader's: an item filed at half past eleven on a Paris evening belongs to the day the newsroom filed it under. That
 * day is the numéro it would have been printed in, and it is named by the same reading the newsstand uses.
 */
export const wireRows = (summaries: readonly ArticleSummary[]): readonly WireRow[] => {
  const rows: WireRow[] = [];
  let heading = '';
  for (const summary of summaries) {
    const day = issueIdAt(summary.publishedAt);
    if (day !== heading) {
      heading = day;
      rows.push({ kind: 'day', day, label: formatDayLabel(summary.publishedAt) });
    }
    rows.push({ kind: 'item', summary });
  }
  return rows;
};

/** What tells one line of the wire from another for the list: each kind mounts its own tree, and only its own. */
export const rowKind = (row: WireRow): string => row.kind;

/** The name a line keeps for as long as it is on the wire. */
export const rowKey = (row: WireRow): string =>
  row.kind === 'day' ? `day:${row.day}` : `${row.kind}:${row.summary.id}`;

/** Whether a line stays at the top while the run it opens scrolls past: the head of a day does, nothing else. */
export const rowPins = (row: WireRow): boolean => row.kind === 'day';
