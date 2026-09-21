import type { DisplayText } from '@huma/contracts';
import { NEWSROOM_ZONE } from '@huma/contracts';
import { asDisplayText } from '../display-text';

/**
 * The newspaper's own clock. A publication time is a Paris time, so a card shows the day the newsroom published on
 * whatever the reader's device is set to — and a test reads the same string on any machine. Hermes has neither
 * `Intl.RelativeTimeFormat` nor `Intl.PluralRules` (journal 0a, vérification 15), so the words below are written here.
 *
 * The zone comes from the contracts: this clock says what an instant looks like, not which instant it is, and which
 * one it is was settled where the paper's own day is named.
 */
const NEWSROOM_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: NEWSROOM_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const PER_MINUTE = 60;
const PER_HOUR = 60 * PER_MINUTE;

/** An instant as the newsroom's clock reads it. */
type Clock = Readonly<{ year: number; month: number; day: number; hour: number; minute: number }>;

const readClock = (instant: number): Clock => {
  const parts = new Map<string, string>(
    NEWSROOM_CLOCK.formatToParts(instant).map((part): readonly [string, string] => [part.type, part.value]),
  );
  const read = (type: string): number => Number(parts.get(type) ?? '0');
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute') };
};

const parseInstant = (instant: string): number => {
  const millis = Date.parse(instant);
  if (Number.isNaN(millis)) {
    throw new RangeError(`instant invalide : ${instant}`);
  }
  return millis;
};

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * The weekdays as `getUTCDay` numbers them, Sunday first, and the months as the clock numbers them, January first.
 * They are written here rather than asked of `Intl` in French: the clock above is pinned to one locale precisely so
 * the printed forms do not follow the device's own data, and a heading that did would read differently from one phone
 * to the next while the rest of the screen did not.
 */
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

const nameAt = (names: readonly string[], index: number): string => {
  const name = names[index];
  if (name === undefined) {
    throw new RangeError(`aucun nom au rang ${String(index)}`);
  }
  return name;
};

// The bare `12/09/2026` a card used to carry is not written anywhere now. Nielsen's homepage guideline says why: as
// long as the whole of a front is of the week — and this paper's corpus is three days of one — no card needs a date,
// and the article needs one printed prominently. The article's is `formatLongDate`, in letters.

/**
 * The hour an item was filed, as a row of the wire carries it: `19:52`.
 *
 * It carried the day as well — `12/09, 19:52` — under a band that stayed pinned at the top of the same screen reading
 * `samedi 12 septembre`. The same date, printed once over the run and again on each of the dozen rows inside it. What
 * that cost is a width and not a line: measured on an A065, the pair took 83 points of a 411-point screen and, with
 * the rail beside it, pushed every title to start 140 points in — so the titles wrapped to four lines where they had
 * the room for three. The hour alone takes 34.
 */
export const formatClockTime = (instant: string): DisplayText => {
  const clock = readClock(parseInstant(instant));
  return asDisplayText(`${pad(clock.hour)}:${pad(clock.minute)}`);
};

// The calendar day an instant falls on is not here. It was, and it was the second place the paper computed it — the
// content door mints a numéro from the same reading, and `ISSUE_ID` already said of itself that the two were one key.
// `issueIdAt` in the contracts is that key now, and a wire groups its runs by it.

/**
 * That same day as a timeline heads the run it opens: `samedi 13 septembre`. The year is left out, a wire reaching
 * back weeks at most; the weekday is read from the Paris calendar date rather than from the instant, so a publication
 * just before Paris midnight heads the day the newsroom filed it under, not the one UTC was already on.
 */
export const formatDayLabel = (instant: string): DisplayText => {
  const clock = readClock(parseInstant(instant));
  const weekday = new Date(Date.UTC(clock.year, clock.month - 1, clock.day)).getUTCDay();
  return asDisplayText(`${nameAt(WEEKDAYS, weekday)} ${String(clock.day)} ${nameAt(MONTHS, clock.month - 1)}`);
};

/**
 * That same day as a front page carries it: `13 septembre`.
 *
 * The weekday is left off, and not to save room for its own sake. A wire needs it because a wire spans days and a
 * reader arriving in the middle of one is orienting themself in time; a cover is dated, and on a shelf of consecutive
 * numéros the number is what tells one from the next. Measured on an A065: the longest of the four days the paper has
 * printed asks 141 points of a cover that has 124, so the weekday was not being read anyway — it was pushing the month
 * off the edge. Letting it wrap instead would have split two covers of four onto two lines and left their pictures
 * starting at different heights, side by side on the same shelf.
 */
export const formatDayDate = (instant: string): DisplayText => {
  const clock = readClock(parseInstant(instant));
  return asDisplayText(`${String(clock.day)} ${nameAt(MONTHS, clock.month - 1)}`);
};

/**
 * The day an article was published, written out where an article prints it: `13 septembre 2026`.
 *
 * It is the one place in the paper that carries a year, and the one that carries a month in letters. Nielsen's
 * homepage guideline says both halves of that: a front page of one week's stories needs no date on each card, and the
 * full article needs one printed prominently. The weekday is left off — a wire needs it because a wire spans days and
 * a reader is orienting themself in time, an article carries its own date and the year is what places it.
 */
export const formatLongDate = (instant: string): DisplayText => {
  const clock = readClock(parseInstant(instant));
  return asDisplayText(`${String(clock.day)} ${nameAt(MONTHS, clock.month - 1)} ${String(clock.year)}`);
};

/**
 * The signature under an article: `Par Lisa Guillemin`, and `Par Lisa Guillemin et Yves Kerlan` for two. The contract
 * allows no more than two names, so a list needs no comma — and the joining word is written here, with the weekdays
 * above, for the same reason: a formatter may not reach the dictionary, and the words it prints are its own.
 */
export const formatByline = (names: readonly string[]): DisplayText => {
  if (names.length === 0) {
    throw new RangeError('un article est signé');
  }
  return asDisplayText(`Par ${names.join(' et ')}`);
};

/** A running time, as a player prints it: `4:18`, and `1:04:18` once past the hour. */
export const formatDuration = (seconds: number): DisplayText => {
  const hours = Math.floor(seconds / PER_HOUR);
  const minutes = Math.floor((seconds % PER_HOUR) / PER_MINUTE);
  const rest = seconds % PER_MINUTE;
  return asDisplayText(hours > 0 ? `${String(hours)}:${pad(minutes)}:${pad(rest)}` : `${String(minutes)}:${pad(rest)}`);
};
