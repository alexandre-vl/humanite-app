import type { ArticleSummary, DisplayText } from '@huma/contracts';
import { formatDayKey, formatDayLabel } from '#lib/format';

/** One line of the wire: the picture it opens on, the head of a day, or an item of that day. */
export type WireRow =
  | Readonly<{ kind: 'hero'; summary: ArticleSummary }>
  | Readonly<{ kind: 'day'; day: string; label: DisplayText }>
  | Readonly<{ kind: 'item'; summary: ArticleSummary }>;

/**
 * The lines the wire shows, in order: the newest illustrated item opens it, then every item under the head of the day
 * it was published on. The opener is not listed again below, being already on the screen.
 *
 * The wire arrives newest first, so a day ends exactly where the next begins and a single pass finds every run —
 * which is as well, Hermes having no `Object.groupBy`. Days are told apart by the newsroom's calendar, not by the
 * reader's: an item filed at half past eleven on a Paris evening belongs to the day the newsroom filed it under.
 */
export const wireRows = (summaries: readonly ArticleSummary[]): readonly WireRow[] => {
  const opener = summaries.find((summary) => summary.hero !== undefined);
  const rows: WireRow[] = opener === undefined ? [] : [{ kind: 'hero', summary: opener }];
  let heading = '';
  for (const summary of summaries) {
    if (summary.id !== opener?.id) {
      const day = formatDayKey(summary.publishedAt);
      if (day !== heading) {
        heading = day;
        rows.push({ kind: 'day', day, label: formatDayLabel(summary.publishedAt) });
      }
      rows.push({ kind: 'item', summary });
    }
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
