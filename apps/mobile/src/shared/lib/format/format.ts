import type { DisplayText } from '@huma/contracts';
import { asDisplayText } from '../display-text';

/**
 * The newspaper's own clock. A publication time is a Paris time, so a card shows the day the newsroom published on
 * whatever the reader's device is set to — and a test reads the same string on any machine. Hermes has neither
 * `Intl.RelativeTimeFormat` nor `Intl.PluralRules` (journal 0a, vérification 15), so the words below are written here.
 */
const NEWSROOM_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
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

/** The day an item was published, in the one form the newspaper prints: `12/09/2026`. */
export const formatDate = (instant: string): DisplayText => {
  const clock = readClock(parseInstant(instant));
  return asDisplayText(`${pad(clock.day)}/${pad(clock.month)}/${String(clock.year)}`);
};

/** The moment an item was published, as a timeline row carries it: `12/09, 19:52`. */
export const formatDateTime = (instant: string): DisplayText => {
  const clock = readClock(parseInstant(instant));
  return asDisplayText(`${pad(clock.day)}/${pad(clock.month)}, ${pad(clock.hour)}:${pad(clock.minute)}`);
};

/**
 * The calendar day an instant falls on, on the newsroom's clock: `2026-09-13`. It is a key, not a text — a timeline
 * compares it to tell one run of items from the next, and never shows it.
 */
export const formatDayKey = (instant: string): string => {
  const clock = readClock(parseInstant(instant));
  return `${String(clock.year)}-${pad(clock.month)}-${pad(clock.day)}`;
};

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
