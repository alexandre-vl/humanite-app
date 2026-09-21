import { NEWSROOM_ZONE } from '@huma/contracts';

/** The clock the corpus is written on: front matter names newsroom hours, so a bare stamp is a Paris reading. */
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

/** What the newsroom's clock reads at an instant, field by field: the separators it puts between them vary, they do not. */
const clockAt = (instant: number): Map<string, string> =>
  new Map<string, string>(
    NEWSROOM_CLOCK.formatToParts(instant).map((part): readonly [string, string] => [part.type, part.value]),
  );

/** How far the newsroom runs ahead of UTC at an instant, in milliseconds: an hour in winter, two in summer. */
const offsetAt = (instant: number): number => {
  const parts = clockAt(instant);
  const read = (type: string): number => Number(parts.get(type) ?? '0');
  return Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second')) - instant;
};

/**
 * A `2026-09-10 08:30` stamp to the instant it names on the newsroom's clock. Reading it as UTC would move every item
 * two hours into the evening; the offset is measured at the instant itself, so a stamp either side of a change of hour
 * still lands where it was written. A value of any other shape comes back untouched, for the schema to refuse it.
 */
export const toInstant = (value: string): string => {
  const [, date, time] = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/u.exec(value) ?? [];
  if (date === undefined || time === undefined) {
    return value;
  }
  const read = Date.parse(`${date}T${time}:00.000Z`);
  return new Date(read - offsetAt(read - offsetAt(read))).toISOString();
};
