import type { DisplayText, IssueId } from '@huma/contracts';
import { clockAt } from '@huma/contracts';
import { asDisplayText } from '../display-text';

/**
 * What an instant looks like on the newspaper's own clock. A publication time is a Paris time, so a card shows the day
 * the newsroom published on whatever the reader's device is set to — and a test reads the same string on any machine.
 *
 * The clock is the contracts' own, and not one kept here. This module kept one, built the same way as the one that
 * names a numéro and the one the corpus stamps its items with; three copies of one clock are three places a change of
 * locale or of hour cycle could reach one of them and not the others. Which instant a stamp names, which day it falls
 * on and what it reads as are one reading now.
 *
 * What stays here is the words. Hermes has neither `Intl.RelativeTimeFormat` nor `Intl.PluralRules` (journal 0a,
 * vérification 15), so the words below are written by hand.
 */
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
 * They are written here rather than asked of `Intl` in French: the newsroom's clock is read in one locale precisely so
 * the printed forms do not follow the device's own data, and a heading that did would read differently from one phone
 * to the next while the rest of the screen did not.
 *
 * A weekday is only ever printed at the head of what it dates — a band over a run of the wire, the date that closes a
 * card — so it is written with the capital a French line opens on. The band read `samedi 12 septembre` in the lower
 * case, the one heading on its screen that began without one.
 */
const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const;
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

/** A day of the month as French prints it: `1er` for the first, the number for every other. */
const dayOf = (day: number): string => (day === 1 ? '1er' : String(day));

/**
 * The hour an item was filed, as the paper prints it wherever it prints one: `19\u00A0h\u00A052`, the letter held to
 * its numbers, and the hour without a zero in front of it.
 *
 * One form for every screen. The wire printed `19:52` while the article printed `à 19 h 52`, so the same piece was
 * filed at two different-looking times two taps apart. The hour sits on its own line over a row's title now, where
 * the two letters it gains cost no line.
 */
export const formatHour = (instant: string): DisplayText => {
  const clock = clockAt(parseInstant(instant));
  return asDisplayText(`${String(clock.hour)}\u00A0h\u00A0${pad(clock.minute)}`);
};

// The calendar day an instant falls on is the contracts' `issueIdAt`: one key, which a numéro is named by, a wire
// groups its runs under and a card is dated against.

/**
 * That same day as a timeline heads the run it opens, and as a card names a day of the week before: `Samedi 13
 * septembre`. The year is left out, a wire reaching back weeks at most; the weekday is read from the Paris calendar
 * date rather than from the instant, so a publication just before Paris midnight heads the day the newsroom filed it
 * under, not the one UTC was already on.
 */
export const formatDayLabel = (instant: string): DisplayText => {
  const clock = clockAt(parseInstant(instant));
  const weekday = new Date(Date.UTC(clock.year, clock.month - 1, clock.day)).getUTCDay();
  return asDisplayText(`${nameAt(WEEKDAYS, weekday)} ${dayOf(clock.day)} ${nameAt(MONTHS, clock.month - 1)}`);
};

/**
 * That same day as a cover carries it, and as a card does once it is older than a week: `13 septembre`.
 *
 * The weekday is left off, and not to save room for its own sake. A wire needs it because a wire spans days and a
 * reader arriving in the middle of one is orienting themself in time; a cover is dated, and on a shelf of consecutive
 * numéros the number is what tells one from the next. Measured on an A065: the longest of the four days the paper has
 * printed asks 141 points of a cover that has 124, so the weekday was not being read anyway — it was pushing the month
 * off the edge. Letting it wrap instead would have split two covers of four onto two lines and left their pictures
 * starting at different heights, side by side on the same shelf.
 */
export const formatDayDate = (instant: string): DisplayText => {
  const clock = clockAt(parseInstant(instant));
  return asDisplayText(`${dayOf(clock.day)} ${nameAt(MONTHS, clock.month - 1)}`);
};

/**
 * The day an article was published, written out in full: `13 septembre 2026`.
 *
 * It is the one date that carries a year: an article reached from a search two years on is read out of the day it
 * was written in, and Nielsen's homepage guideline has the full article print its date prominently, year and all. A
 * card carries it only for an item of another year than the reader's.
 */
export const formatLongDate = (instant: string): DisplayText => {
  const clock = clockAt(parseInstant(instant));
  return asDisplayText(`${dayOf(clock.day)} ${nameAt(MONTHS, clock.month - 1)} ${String(clock.year)}`);
};

/**
 * When an article was published, as its head prints it: `23 septembre 2026 à 6\u00A0h\u00A057`. The wire lists the
 * same piece at its hour, and an article of the morning and one of the evening are not the same news: the day alone
 * said less of the piece than the wire did.
 */
export const formatPublished = (instant: string): DisplayText =>
  asDisplayText(`${formatLongDate(instant)} à ${formatHour(instant)}`);

/** Back a week, a weekday names one day only; seven days back, `Lundi` would be two. */
const WEEK = 7;

const DAY_MILLIS = 86_400_000;

/** A calendar day as a count of days, so two of them are told apart by a subtraction and no clock change counts. */
const dayNumber = (year: number, month: number, day: number): number => Date.UTC(year, month - 1, day) / DAY_MILLIS;

/**
 * When an item was published, as a card says it, against the day the reader is reading on: `12\u00A0h\u00A001` for an
 * item of that day, `Hier à 18\u00A0h\u00A030` for one of the day before, `Lundi 21 septembre` within the week,
 * `4 juillet` earlier in the year and `4 juillet 2025` before it.
 *
 * Every card carries it, the front's included. The front went without, on Nielsen's guideline that a homepage whose
 * stories are all of one week needs no date on each — a guideline that asks for a date at the top of the page instead,
 * which this one never printed, and a front the journal's service fills over seventeen hours: a piece of last night
 * read as one of this morning. The Guardian's fronts print an hour on every card less than twelve hours old, and
 * Google News an age on every card.
 *
 * An hour rather than an age. « Il y a 2 h » is true when it is drawn and false an hour later in a list left open,
 * where an hour of the day stays true; and it is the form the wire and the article already print.
 */
export const formatWhen = (instant: string, today: IssueId): DisplayText => {
  const clock = clockAt(parseInstant(instant));
  const [year = 0, month = 0, day = 0] = today.split('-').map(Number);
  const before = dayNumber(year, month, day) - dayNumber(clock.year, clock.month, clock.day);
  if (before <= 0) {
    return formatHour(instant);
  }
  if (before === 1) {
    return asDisplayText(`Hier à ${formatHour(instant)}`);
  }
  if (before < WEEK) {
    return formatDayLabel(instant);
  }
  return clock.year === year ? formatDayDate(instant) : formatLongDate(instant);
};

/**
 * The signature under an article: `Par Lisa Guillemin`.
 *
 * It took a list of names and joined them, back when an item carried identifiers into a roster and the app turned
 * them into names itself. The journal writes the signature out — one name, two joined by a word of its own choosing,
 * or the newsroom as a whole — so what is left to decide is the word in front of it. That word is written here, with
 * the weekdays and the months above, for the same reason: a formatter may not reach the dictionary, and the words it
 * prints are its own.
 */
export const formatByline = (byline: DisplayText): DisplayText => {
  if (byline.trim() === '') {
    throw new RangeError('un article est signé');
  }
  // The newsroom as a whole signs one piece in nine as `La rédaction`, capital and all, which reads as a name after
  // the word in front of it: « Par La rédaction ». A newsroom is not a name, and French writes it in the lower case.
  return asDisplayText(`Par ${byline.replace(/^La rédaction$/u, 'la rédaction')}`);
};
