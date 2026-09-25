import type { Instant, IssueId } from '@huma/contracts';
import { INSTANT, issueIdAt } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { asDisplayText } from '../display-text';
import {
  daysAgo,
  formatAge,
  formatByline,
  formatDayDate,
  formatDayHead,
  formatDayLabel,
  formatFiled,
  formatHour,
  formatLongDate,
  formatPublished,
  formatWhen,
} from './index';

/** An instant as an item carries one, minted by the schema that reads it. */
const at = (text: string): Instant => INSTANT.parse(text);

describe('formatHour', () => {
  /** The French form, its letter held to its numbers, and no zero in front of an hour of one figure. */
  it('imprime l’heure à la française, la lettre tenue à ses chiffres', () => {
    expect(formatHour(at('2026-09-12T17:52:00.000Z'))).toBe('19\u00A0h\u00A052');
    expect(formatHour(at('2026-09-12T07:05:00.000Z'))).toBe('9\u00A0h\u00A005');
  });

  // The hour is the newsroom's, like every other reading here: an instant filed just before Paris midnight shows the
  // hour Paris was on, under the head of the day Paris was on.
  it('lit l’heure de Paris, donc une fin de soirée passe minuit avec elle', () => {
    expect(formatHour(at('2026-09-12T22:05:00.000Z'))).toBe('0\u00A0h\u00A005');
    expect(formatHour(at('2026-09-12T23:30:00.000Z'))).toBe('1\u00A0h\u00A030');
  });
});

// The calendar day an instant falls on is held by `issueIdAt` in the contracts, beside the brand whose own words say
// it is the key a wire groups its runs under. It was computed twice, here and in the content package, from two clocks.

describe('formatDayDate', () => {
  it('date une couverture par son jour et son mois, sans le jour de la semaine', () => {
    expect(formatDayDate(at('2026-09-12T17:52:00.000Z'))).toBe('12\u00A0septembre');
  });

  it('lit la date de Paris, donc une fin de soirée date du lendemain', () => {
    expect(formatDayDate(at('2026-09-12T22:30:00.000Z'))).toBe('13\u00A0septembre');
  });

  /**
   * A cover has 124 points of room for this, measured on an A065; the four days the paper has printed are the four
   * this has to fit, and the longest of them is what pushed the weekday off in the first place.
   */
  it('tient dans la largeur d’une couverture pour chacun des jours parus', () => {
    const days = ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'].map((day) =>
      formatDayDate(at(`${day}T09:00:00.000Z`)),
    );
    expect(days).toEqual(['10\u00A0septembre', '11\u00A0septembre', '12\u00A0septembre', '13\u00A0septembre']);
    expect(Math.max(...days.map((day) => day.length))).toBeLessThan('dimanche 13\u00A0septembre'.length);
  });
});

describe('formatLongDate', () => {
  it('date un article de son jour, de son mois et de son année', () => {
    expect(formatLongDate(at('2026-09-13T09:00:00.000Z'))).toBe('13\u00A0septembre 2026');
  });

  /** The Paris day, like every other reading of the clock: an article filed at 00:30 in Paris is that day's. */
  it('lit le jour à l’heure de Paris, donc un article du soir tard date du lendemain', () => {
    expect(formatLongDate(at('2026-12-31T23:30:00.000Z'))).toBe('1er\u00A0janvier 2027');
  });

  /** It is the one date the paper writes out, and the one that carries a year: nothing else here does both. */
  it('porte l’année, que nulle autre date du journal ne porte', () => {
    expect(formatLongDate(at('2026-09-13T09:00:00.000Z'))).toContain('2026');
    expect(formatDayLabel(at('2026-09-13T09:00:00.000Z'))).not.toContain('2026');
    expect(formatDayDate(at('2026-09-13T09:00:00.000Z'))).not.toContain('2026');
  });
});

describe('formatDayLabel', () => {
  it('ouvre une série par son jour de la semaine, son jour et son mois', () => {
    expect(formatDayLabel(at('2026-09-12T17:52:00.000Z'))).toBe('Samedi 12\u00A0septembre');
  });

  it('lit le jour de la semaine à l’heure de Paris, donc une fin de soirée ouvre le lendemain', () => {
    expect(formatDayLabel(at('2026-09-12T22:30:00.000Z'))).toBe('Dimanche 13\u00A0septembre');
  });

  it('laisse sans zéro un jour d’un seul chiffre', () => {
    expect(formatDayLabel(at('2026-01-01T09:00:00.000Z'))).toBe('Jeudi 1er\u00A0janvier');
  });

  it('nomme chaque mois', () => {
    const months = [...Array.from({ length: 12 }).keys()].map((index) =>
      formatDayLabel(at(`2026-${String(index + 1).padStart(2, '0')}-15T09:00:00.000Z`)),
    );
    expect(months).toEqual([
      'Jeudi 15\u00A0janvier',
      'Dimanche 15\u00A0février',
      'Dimanche 15\u00A0mars',
      'Mercredi 15\u00A0avril',
      'Vendredi 15\u00A0mai',
      'Lundi 15\u00A0juin',
      'Mercredi 15\u00A0juillet',
      'Samedi 15\u00A0août',
      'Mardi 15\u00A0septembre',
      'Jeudi 15\u00A0octobre',
      'Dimanche 15\u00A0novembre',
      'Mardi 15\u00A0décembre',
    ]);
  });
});

describe('formatDayHead', () => {
  /** The day the reader reads on, as the phone's clock gives it: a Paris calendar date. */
  const on = (day: string): IssueId => issueIdAt(at(`${day}T12:00:00.000Z`));

  /** A reader does not always know the date: the head of the day they are on says it is theirs. */
  it('nomme « Aujourd’hui » la journée du lecteur et « Hier » la veille', () => {
    expect(formatDayHead(at('2026-09-25T07:00:00.000Z'), on('2026-09-25'))).toBe('Aujourd\u2019hui');
    expect(formatDayHead(at('2026-09-24T07:00:00.000Z'), on('2026-09-25'))).toBe('Hier');
  });

  it('nomme les jours d’avant par leur date, comme l’en-tête d’une série', () => {
    expect(formatDayHead(at('2026-09-23T07:00:00.000Z'), on('2026-09-25'))).toBe('Mercredi 23\u00A0septembre');
  });

  it('compte à l’heure de Paris, donc une fin de soirée ouvre déjà la journée du lecteur', () => {
    expect(formatDayHead(at('2026-09-24T22:30:00.000Z'), on('2026-09-25'))).toBe('Aujourd\u2019hui');
    expect(formatDayHead(at('2026-09-24T21:30:00.000Z'), on('2026-09-25'))).toBe('Hier');
  });

  /** A phone whose clock runs behind the newsroom's is handed a day from its future: it is the reader's day. */
  it('tient pour la journée du lecteur une journée d’après la sienne', () => {
    expect(formatDayHead(at('2026-09-26T07:00:00.000Z'), on('2026-09-25'))).toBe('Aujourd\u2019hui');
  });
});

describe('daysAgo', () => {
  const on = (day: string): IssueId => issueIdAt(at(`${day}T12:00:00.000Z`));

  it('compte les jours du calendrier de Paris, quelle que soit l’heure', () => {
    expect(daysAgo(at('2026-09-25T00:30:00.000Z'), on('2026-09-25'))).toBe(0);
    expect(daysAgo(at('2026-09-24T21:59:00.000Z'), on('2026-09-25'))).toBe(1);
    expect(daysAgo(at('2026-12-31T09:00:00.000Z'), on('2027-01-02'))).toBe(2);
    expect(daysAgo(at('2026-10-24T22:30:00.000Z'), on('2026-10-26'))).toBe(1);
    expect(daysAgo(at('2026-09-26T09:00:00.000Z'), on('2026-09-25'))).toBe(-1);
  });
});

describe('formatPublished', () => {
  /** The hour on the newsroom's clock, written the French way, its letter held to its numbers. */
  it('écrit le jour et l’heure où l’article a paru, à l’heure de Paris', () => {
    expect(formatPublished(at('2026-09-23T04:57:00.000Z'))).toBe('23\u00A0septembre 2026 à 6\u00A0h\u00A057');
    expect(formatPublished(at('2026-09-01T10:05:00.000Z'))).toBe('1er\u00A0septembre 2026 à 12\u00A0h\u00A005');
  });
});

describe('formatWhen', () => {
  /** The day the reader reads on, as the phone's clock gives it: a Paris calendar date. */
  const on = (day: string): IssueId => issueIdAt(at(`${day}T12:00:00.000Z`));

  it('donne son heure à un article du jour, et rien d’autre', () => {
    expect(formatWhen(at('2026-09-23T10:01:00.000Z'), on('2026-09-23'))).toBe('12\u00A0h\u00A001');
  });

  /** The front runs over seventeen hours: last night's pieces sit among this morning's, and say so. */
  it('dit « Hier » à un article de la veille, avec son heure', () => {
    expect(formatWhen(at('2026-09-22T16:30:00.000Z'), on('2026-09-23'))).toBe('Hier à 18\u00A0h\u00A030');
  });

  it('compte les jours à l’heure de Paris, donc minuit passé à Paris est déjà le jour du lecteur', () => {
    expect(formatWhen(at('2026-09-22T22:30:00.000Z'), on('2026-09-23'))).toBe('0\u00A0h\u00A030');
    expect(formatWhen(at('2026-09-22T21:30:00.000Z'), on('2026-09-23'))).toBe('Hier à 23\u00A0h\u00A030');
  });

  it('nomme le jour de la semaine tant qu’il n’en désigne qu’un', () => {
    expect(formatWhen(at('2026-09-21T09:00:00.000Z'), on('2026-09-23'))).toBe('Lundi 21\u00A0septembre');
    expect(formatWhen(at('2026-09-17T09:00:00.000Z'), on('2026-09-23'))).toBe('Jeudi 17\u00A0septembre');
    expect(formatWhen(at('2026-09-16T09:00:00.000Z'), on('2026-09-23'))).toBe('16\u00A0septembre');
  });

  /** Only another year than the reader's is printed: a section reaches back weeks, a search two years. */
  it('ne porte l’année que pour une autre année que celle du lecteur', () => {
    expect(formatWhen(at('2026-07-04T09:00:00.000Z'), on('2026-09-23'))).toBe('4\u00A0juillet');
    expect(formatWhen(at('2025-07-04T09:00:00.000Z'), on('2026-09-23'))).toBe('4\u00A0juillet 2025');
  });

  it('compte en jours du calendrier, par-dessus la fin d’une année comme par-dessus un changement d’heure', () => {
    expect(formatWhen(at('2026-12-31T09:00:00.000Z'), on('2027-01-02'))).toBe('Jeudi 31\u00A0décembre');
    expect(formatWhen(at('2026-12-20T09:00:00.000Z'), on('2027-01-02'))).toBe('20\u00A0décembre 2026');
    expect(formatWhen(at('2026-10-24T22:30:00.000Z'), on('2026-10-26'))).toBe('Hier à 0\u00A0h\u00A030');
  });

  /** A phone whose clock runs behind the newsroom's is handed an item from its future: it reads as the day's. */
  it('donne son heure à un article daté d’après le jour du lecteur', () => {
    expect(formatWhen(at('2026-09-24T07:00:00.000Z'), on('2026-09-23'))).toBe('9\u00A0h\u00A000');
  });
});

describe('formatByline', () => {
  /** The newsroom signing as a whole is not a name, and French writes it in the lower case after the word before it. */
  it('signe au nom d’une personne, et au nom de la rédaction en minuscule', () => {
    expect(formatByline(asDisplayText('Lisa Guillemin'))).toBe('Par Lisa Guillemin');
    expect(formatByline(asDisplayText('La rédaction'))).toBe('Par la rédaction');
  });
});

describe('formatAge', () => {
  /** The clock a running list is read against: a fixed moment, so the test reads the same thing on any machine. */
  const now = Date.parse('2026-09-25T10:00:00.000Z');
  const ago = (millis: number): Instant => at(new Date(now - millis).toISOString());

  it.each([
    { title: 'à la seconde', millis: 12_000, reads: 'À l’instant' },
    { title: 'à la minute', millis: 60_000, reads: 'Il y a 1\u00A0minute' },
    { title: 'à plusieurs minutes', millis: 7 * 60_000, reads: 'Il y a 7\u00A0minutes' },
    { title: 'à l’heure', millis: 3_600_000, reads: 'Il y a 1\u00A0heure' },
    { title: 'à plusieurs heures', millis: 3 * 3_600_000, reads: 'Il y a 3\u00A0heures' },
  ])('dit $title ce qui vient de tomber', ({ millis, reads }) => {
    expect(formatAge(ago(millis), now)).toBe(asDisplayText(reads));
  });

  /** Past six hours a count stops measuring recency and becomes arithmetic the reader has to do backwards. */
  it('ne compte plus rien au-delà de six heures', () => {
    expect(formatAge(ago(6 * 3_600_000), now)).toBeNull();
    expect(formatAge(ago(30 * 3_600_000), now)).toBeNull();
  });

  /** A clock a little behind the newsroom's would otherwise read « Il y a -1 minute ». */
  it('ne compte rien d’un instant qui n’est pas encore arrivé', () => {
    expect(formatAge(ago(-60_000), now)).toBeNull();
  });
});

describe('formatFiled', () => {
  const now = Date.parse('2026-09-25T10:00:00.000Z');

  it('dit l’âge tant qu’il est vrai, puis l’heure de la rédaction', () => {
    expect(formatFiled(at('2026-09-25T09:45:00.000Z'), now)).toBe(asDisplayText('Il y a 15\u00A0minutes'));
    expect(formatFiled(at('2026-09-24T19:52:00.000Z'), now)).toBe(formatHour(at('2026-09-24T19:52:00.000Z')));
  });
});
