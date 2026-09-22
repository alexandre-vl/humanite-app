import type { IssueId } from './ids.ts';
import { ISSUE_ID } from './ids.ts';

/**
 * The zone the newsroom keeps, and the one reading of an instant that everything downstream shares.
 *
 * It is written here and nowhere else because it is a fact about the paper, not about a screen: a stamp in the corpus
 * is a Paris hour, a numéro is a Paris day, and a wire heads its runs by the Paris calendar. Each of those is computed
 * somewhere different — the corpus is built by a generator, the numéros by the content door, the runs by a screen —
 * and a zone spelt out in three places is three places one could be changed without the others.
 *
 * Every reading of the clock is made below, so nothing outside this module needs to know which zone the paper keeps —
 * only what its clock reads. The tests of daylight saving below are what hold it to Paris.
 */
const NEWSROOM_ZONE = 'Europe/Paris';

/** What the newsroom's clock reads, field by field, each as the number it is. */
export type Clock = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}>;

/**
 * The newsroom's clock, read in one locale whatever the phone is set to, so the parts come back in the same shape on
 * every device and in every test. The hour runs `00` to `23`: a clock that read midnight as `24` would file it under
 * the wrong day.
 *
 * It is the one clock of the repository: the day a numéro is filed under, the stamps the corpus is written with and the
 * hour a row prints are all read on it, for the same reason the zone above is written once.
 */
const NEWSROOM_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: NEWSROOM_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * What the newsroom's clock reads at an instant, given in milliseconds since the epoch.
 *
 * An instant nothing can read is refused rather than read as some day: the formatter throws a `RangeError` on what it
 * is handed, and what is built on a reading would rather stop than stand on a clock that never read anything.
 */
export const clockAt = (instant: number): Clock => {
  const parts = new Map(
    NEWSROOM_CLOCK.formatToParts(instant).map((part): readonly [string, string] => [part.type, part.value]),
  );
  const read = (type: string): number => Number(parts.get(type) ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
};

/** A field of a calendar written on two signs, so a day or a month of one digit still sorts as a string. */
const twoSigns = (value: number): string => String(value).padStart(2, '0');

/**
 * The numéro an instant belongs to: `2026-09-13`.
 *
 * `ISSUE_ID` says of itself that it is the same key a wire groups its runs under, one instant belonging to exactly one
 * issue — and until this existed, two packages each computed it from a clock of their own, agreeing by luck. This is
 * the one place that answers, and it answers with the brand rather than with a string, so nothing downstream can mint
 * a day the shape of an issue without being one.
 */
export const issueIdAt = (instant: string): IssueId => {
  const clock = clockAt(Date.parse(instant));
  return ISSUE_ID.parse(`${String(clock.year)}-${twoSigns(clock.month)}-${twoSigns(clock.day)}`);
};

/**
 * A reading of the newsroom's clock written without its zone. The corpus writes `2026-09-10 08:30`; the journal's
 * service writes `2026-09-21T07:00:00` on its lists and `2026-09-21 07:00:00` on its front page — the same clock, in
 * three hands, none of them saying which clock it is.
 */
const STAMP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/u;

/** How far the newsroom runs ahead of UTC at an instant, in milliseconds: an hour in winter, two in summer. */
const offsetAt = (instant: number): number => {
  const clock = clockAt(instant);
  return Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second) - instant;
};

/**
 * The instant a newsroom stamp names, or nothing when it names none.
 *
 * Read as UTC, every stamp of the paper would land two hours into the evening in summer and one in winter. So the
 * stamp is first read as if it were UTC, then moved back by the newsroom's offset — measured at the instant itself,
 * and measured twice, so that a stamp on either side of a change of hour lands where it was written.
 *
 * A stamp of another shape names nothing, and so does one whose fields are out of their range: `2026-13-40` would be
 * rolled by the calendar into a day in February rather than refused, and a date that was never written is worse than
 * none. What comes back is an instant in UTC, in the form the contracts' schemas read.
 */
export const instantAt = (stamp: string): string | null => {
  const found = STAMP.exec(stamp);
  if (found === null) {
    return null;
  }
  // The seconds are the one field a stamp may leave out; the corpus writes none.
  const [, year = '', month = '', day = '', hour = '', minute = '', second = '00'] = found;
  const written: Clock = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
  const naive = Date.UTC(written.year, written.month - 1, written.day, written.hour, written.minute, written.second);
  const read = new Date(naive);
  const rolled =
    read.getUTCFullYear() !== written.year ||
    read.getUTCMonth() !== written.month - 1 ||
    read.getUTCDate() !== written.day ||
    read.getUTCHours() !== written.hour ||
    read.getUTCMinutes() !== written.minute ||
    read.getUTCSeconds() !== written.second;
  return rolled ? null : new Date(naive - offsetAt(naive - offsetAt(naive))).toISOString();
};
