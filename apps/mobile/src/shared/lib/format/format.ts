import type { DisplayText, Instant, IssueId } from '@huma/contracts';
import { clockOf } from '@huma/contracts';
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
 * vérification 15), so the words below are written by hand. What comes in is an `Instant`, read once where it was
 * minted: each formatter here used to read its string again, and to throw on one that named no instant.
 */

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * The weekdays as `getUTCDay` numbers them, Sunday first, and the months as the clock numbers them, January first.
 * They are written here rather than asked of `Intl` in French: the newsroom's clock is read in one locale precisely so
 * the printed forms do not follow the device's own data, and a heading that did would read differently from one phone
 * to the next while the rest of the screen did not.
 *
 * A weekday is printed at the head of what it dates — a band over a run of the wire, the date that closes a card — so
 * it is written with the capital a French line opens on. The band read `samedi 12 septembre` in the lower case, the
 * one heading on its screen that began without one. Inside a sentence French writes it in the lower case, and the
 * one sentence that names a day takes it down there.
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
 * A day and its month, held on one line: `21\u00A0septembre`, `1er\u00A0juillet`.
 *
 * The number is held to its month the way the hour is held to its letter, and the way the journal holds its own dates
 * — « jeudi 3\u00A0juillet » in the standfirsts its service sends. Every date the app wrote broke there instead, so a
 * line could end on « 21 » and open the next on « septembre », the number read as a count of something.
 */
const dayAndMonth = (day: number, month: number): string => `${dayOf(day)}\u00A0${nameAt(MONTHS, month - 1)}`;

/**
 * The hour an item was filed, as the paper prints it wherever it prints one: `19\u00A0h\u00A052`, the letter held to
 * its numbers, and the hour without a zero in front of it.
 *
 * One form for every screen. The wire printed `19:52` while the article printed `à 19 h 52`, so the same piece was
 * filed at two different-looking times two taps apart. The hour sits on its own line over a row's title now, where
 * the two letters it gains cost no line.
 */
export const formatHour = (instant: Instant): DisplayText => {
  const clock = clockOf(instant);
  return asDisplayText(`${String(clock.hour)}\u00A0h\u00A0${pad(clock.minute)}`);
};

/** How long an item stays young enough to be said in minutes, and then in hours, in milliseconds. */
const AN_HOUR = 3_600_000;
const SIX_HOURS = 6 * AN_HOUR;

/** Under a minute old, there is no number worth printing. */
const A_MINUTE = 60_000;

/**
 * How long ago an item was filed, for an item filed a moment ago: `À l\u2019instant`, `Il y a 7\u00A0minutes`,
 * `Il y a 3\u00A0heures` — and nothing at all once it is older than six hours, where the hour it was filed at says
 * more than a count does.
 *
 * An age was refused here once, and the reason was good: « Il y a 2 h » is true when it is drawn and false an hour
 * later in a list a reader left open, where an hour of the day stays true for ever. What answers it is a clock — the
 * screens that print an age read `useNow`, which ticks, so the line is redrawn while it is on the screen rather than
 * going quietly wrong. What is left of the objection is the cost of that tick, and it is one render a minute over the
 * rows a reader can actually see.
 *
 * Six hours is where it stops, and it is not a round number picked for being round: the journal files between seven
 * in the morning and eleven at night, so six hours is about a third of a working day. Past it a count stops being a
 * measure of recency and starts being arithmetic the reader has to do backwards to place the piece in their own day.
 */
export const formatAge = (instant: Instant, now: number): DisplayText | null => {
  const old = now - Date.parse(instant);
  if (old < 0 || old >= SIX_HOURS) {
    return null;
  }
  if (old < A_MINUTE) {
    return asDisplayText('\u00C0 l\u2019instant');
  }
  if (old < AN_HOUR) {
    const minutes = Math.floor(old / A_MINUTE);
    return asDisplayText(`Il y a ${String(minutes)}\u00A0minute${minutes > 1 ? 's' : ''}`);
  }
  const hours = Math.floor(old / AN_HOUR);
  return asDisplayText(`Il y a ${String(hours)}\u00A0heure${hours > 1 ? 's' : ''}`);
};

/**
 * When an item was filed, as a running list says it: how long ago while that is still the truest thing to say, and
 * the hour of the newsroom's clock once it is not.
 *
 * The day is not here. A list that prints this pins the head of each day over its run, so every row under that head
 * already carries its day; printing it again on each row is the fault this screen was corrected for.
 */
export const formatFiled = (instant: Instant, now: number): DisplayText =>
  formatAge(instant, now) ?? formatHour(instant);

// The calendar day an instant falls on is the contracts' `issueIdAt`: one key, which a numéro is named by, a wire
// groups its runs under and a card is dated against.

/** The day an instant falls on, weekday first, read off the Paris calendar date: `Samedi 13\u00A0septembre`. */
const dayWithWeekday = (instant: Instant): string => {
  const clock = clockOf(instant);
  const weekday = new Date(Date.UTC(clock.year, clock.month - 1, clock.day)).getUTCDay();
  return `${nameAt(WEEKDAYS, weekday)} ${dayAndMonth(clock.day, clock.month)}`;
};

/**
 * That same day as a timeline heads the run it opens, and as a card names a day of the week before: `Samedi
 * 13\u00A0septembre`. The year is left out, a wire reaching back weeks at most; the weekday is read from the Paris
 * calendar date rather than from the instant, so a publication just before Paris midnight heads the day the newsroom
 * filed it under, not the one UTC was already on.
 */
export const formatDayLabel = (instant: Instant): DisplayText => asDisplayText(dayWithWeekday(instant));

/**
 * That same day inside a sentence, its weekday in the lower case: `jeudi 24\u00A0septembre`. The foot of the wire says
 * it while the day is on its way — « Chargement du jeudi 24\u00A0septembre ».
 */
export const formatDayInText = (instant: Instant): DisplayText => {
  const day = dayWithWeekday(instant);
  return asDisplayText(`${day.charAt(0).toLowerCase()}${day.slice(1)}`);
};

/**
 * That same day as a cover carries it, and as a card does once it is older than a week: `13\u00A0septembre`.
 *
 * The weekday is left off, and not to save room for its own sake. A wire needs it because a wire spans days and a
 * reader arriving in the middle of one is orienting themself in time; a cover is dated, and on a shelf of consecutive
 * numéros the number is what tells one from the next. Measured on an A065: the longest of the four days the paper has
 * printed asks 141 points of a cover that has 124, so the weekday was not being read anyway — it was pushing the month
 * off the edge. Letting it wrap instead would have split two covers of four onto two lines and left their pictures
 * starting at different heights, side by side on the same shelf.
 */
export const formatDayDate = (instant: Instant): DisplayText => {
  const clock = clockOf(instant);
  return asDisplayText(dayAndMonth(clock.day, clock.month));
};

/**
 * The day an article was published, written out in full: `13\u00A0septembre 2026`.
 *
 * It is the one date that carries a year: an article reached from a search two years on is read out of the day it
 * was written in, and Nielsen's homepage guideline has the full article print its date prominently, year and all. A
 * card carries it only for an item of another year than the reader's.
 */
export const formatLongDate = (instant: Instant): DisplayText => {
  const clock = clockOf(instant);
  return asDisplayText(`${dayAndMonth(clock.day, clock.month)} ${String(clock.year)}`);
};

/**
 * When an article was published, as its head prints it: `23\u00A0septembre 2026 à 6\u00A0h\u00A057`. The wire lists the
 * same piece at its hour, and an article of the morning and one of the evening are not the same news: the day alone
 * said less of the piece than the wire did.
 */
export const formatPublished = (instant: Instant): DisplayText =>
  asDisplayText(`${formatLongDate(instant)} à ${formatHour(instant)}`);

/** Back a week, a weekday names one day only; seven days back, `Lundi` would be two. */
const WEEK = 7;

const DAY_MILLIS = 86_400_000;

/** A calendar day as a count of days, so two of them are told apart by a subtraction and no clock change counts. */
const dayNumber = (year: number, month: number, day: number): number => Date.UTC(year, month - 1, day) / DAY_MILLIS;

/**
 * When an item was published, as a card says it, against the day the reader is reading on: `12\u00A0h\u00A001` for an
 * item of that day, `Hier à 18\u00A0h\u00A030` for one of the day before, `Lundi 21\u00A0septembre` within the week,
 * `4\u00A0juillet` earlier in the year and `4\u00A0juillet 2025` before it.
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
export const formatWhen = (instant: Instant, today: IssueId): DisplayText => {
  const clock = clockOf(instant);
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
