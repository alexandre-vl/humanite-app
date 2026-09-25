import type { ArticleSummary, DisplayText, Instant, IssueId } from '@huma/contracts';
import { issueIdAt } from '@huma/contracts';
import { formatDayLabel } from '#lib/format';

/**
 * One line of the wire: the head of a day, an item filed on that day, the line under which everything was already out
 * at the reader's last visit, or the line that stands where the items would be when there are none.
 */
export type WireRow =
  | Readonly<{ kind: 'standIn' }>
  | Readonly<{ kind: 'day'; day: IssueId; label: DisplayText }>
  | Readonly<{ kind: 'item'; summary: ArticleSummary }>
  | Readonly<{ kind: 'visit' }>;

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
 * The items arrive newest first, so a day ends exactly where the next begins and a single pass finds every run —
 * which is as well, Hermes having no `Object.groupBy`. Days are told apart by the newsroom's calendar, not by the
 * reader's: an item filed at half past eleven on a Paris evening belongs to the day the newsroom filed it under. That
 * day is the numéro it would have been printed in, and it is named by the same reading the newsstand uses.
 *
 * A run that holds nothing still shows one line. The screen is no longer empty when a reading fails — the menu may be
 * late — and the list has no other line to say so on.
 *
 * `since` is the newest item the wire had shown at the reader's last visit, and a line goes above the first item
 * filed no later than it: what stands over the line came out since, and what stands under it was already out. It goes
 * above the head of that item's day when the item opens one, so a day's head stays with its items. There is no line
 * on a first visit, none when nothing has come out since, and none until the reading reaches that far down.
 */
export const wireRows = (summaries: readonly ArticleSummary[], since: Instant | null = null): readonly WireRow[] => {
  if (summaries.length === 0) {
    return [{ kind: 'standIn' }];
  }
  const rows: WireRow[] = [];
  let heading = '';
  let marked = since === null;
  for (const summary of summaries) {
    if (!marked && since !== null && summary.publishedAt <= since) {
      marked = true;
      if (rows.length > 0) {
        rows.push({ kind: 'visit' });
      }
    }
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
export const rowKey = (row: WireRow): string => {
  switch (row.kind) {
    case 'standIn':
      return 'standIn';
    case 'day':
      return `day:${row.day}`;
    case 'item':
      return `item:${row.summary.id}`;
    case 'visit':
      return 'visit';
  }
};

/** Whether a line stays at the top while the run it opens scrolls past: the head of a day does, nothing else. */
export const rowPins = (row: WireRow): boolean => row.kind === 'day';
