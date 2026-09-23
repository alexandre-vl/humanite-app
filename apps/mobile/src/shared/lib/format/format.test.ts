import type { Instant, IssueId } from '@huma/contracts';
import { INSTANT, issueIdAt } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { asDisplayText } from '../display-text';
import {
  formatByline,
  formatDayDate,
  formatDayLabel,
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
    expect(formatDayDate(at('2026-09-12T17:52:00.000Z'))).toBe('12 septembre');
  });

  it('lit la date de Paris, donc une fin de soirée date du lendemain', () => {
    expect(formatDayDate(at('2026-09-12T22:30:00.000Z'))).toBe('13 septembre');
  });

  /**
   * A cover has 124 points of room for this, measured on an A065; the four days the paper has printed are the four
   * this has to fit, and the longest of them is what pushed the weekday off in the first place.
   */
  it('tient dans la largeur d’une couverture pour chacun des jours parus', () => {
    const days = ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'].map((day) =>
      formatDayDate(at(`${day}T09:00:00.000Z`)),
    );
    expect(days).toEqual(['10 septembre', '11 septembre', '12 septembre', '13 septembre']);
    expect(Math.max(...days.map((day) => day.length))).toBeLessThan('dimanche 13 septembre'.length);
  });
});

describe('formatLongDate', () => {
  it('date un article de son jour, de son mois et de son année', () => {
    expect(formatLongDate(at('2026-09-13T09:00:00.000Z'))).toBe('13 septembre 2026');
  });

  /** The Paris day, like every other reading of the clock: an article filed at 00:30 in Paris is that day's. */
  it('lit le jour à l’heure de Paris, donc un article du soir tard date du lendemain', () => {
    expect(formatLongDate(at('2026-12-31T23:30:00.000Z'))).toBe('1er janvier 2027');
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
    expect(formatDayLabel(at('2026-09-12T17:52:00.000Z'))).toBe('Samedi 12 septembre');
  });

  it('lit le jour de la semaine à l’heure de Paris, donc une fin de soirée ouvre le lendemain', () => {
    expect(formatDayLabel(at('2026-09-12T22:30:00.000Z'))).toBe('Dimanche 13 septembre');
  });

  it('laisse sans zéro un jour d’un seul chiffre', () => {
    expect(formatDayLabel(at('2026-01-01T09:00:00.000Z'))).toBe('Jeudi 1er janvier');
  });

  it('nomme chaque mois', () => {
    const months = [...Array.from({ length: 12 }).keys()].map((index) =>
      formatDayLabel(at(`2026-${String(index + 1).padStart(2, '0')}-15T09:00:00.000Z`)),
    );
    expect(months).toEqual([
      'Jeudi 15 janvier',
      'Dimanche 15 février',
      'Dimanche 15 mars',
      'Mercredi 15 avril',
      'Vendredi 15 mai',
      'Lundi 15 juin',
      'Mercredi 15 juillet',
      'Samedi 15 août',
      'Mardi 15 septembre',
      'Jeudi 15 octobre',
      'Dimanche 15 novembre',
      'Mardi 15 décembre',
    ]);
  });
});

describe('formatPublished', () => {
  /** The hour on the newsroom's clock, written the French way, its letter held to its numbers. */
  it('écrit le jour et l’heure où l’article a paru, à l’heure de Paris', () => {
    expect(formatPublished(at('2026-09-23T04:57:00.000Z'))).toBe('23 septembre 2026 à 6\u00A0h\u00A057');
    expect(formatPublished(at('2026-09-01T10:05:00.000Z'))).toBe('1er septembre 2026 à 12\u00A0h\u00A005');
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
    expect(formatWhen(at('2026-09-21T09:00:00.000Z'), on('2026-09-23'))).toBe('Lundi 21 septembre');
    expect(formatWhen(at('2026-09-17T09:00:00.000Z'), on('2026-09-23'))).toBe('Jeudi 17 septembre');
    expect(formatWhen(at('2026-09-16T09:00:00.000Z'), on('2026-09-23'))).toBe('16 septembre');
  });

  /** Only another year than the reader's is printed: a section reaches back weeks, a search two years. */
  it('ne porte l’année que pour une autre année que celle du lecteur', () => {
    expect(formatWhen(at('2026-07-04T09:00:00.000Z'), on('2026-09-23'))).toBe('4 juillet');
    expect(formatWhen(at('2025-07-04T09:00:00.000Z'), on('2026-09-23'))).toBe('4 juillet 2025');
  });

  it('compte en jours du calendrier, par-dessus la fin d’une année comme par-dessus un changement d’heure', () => {
    expect(formatWhen(at('2026-12-31T09:00:00.000Z'), on('2027-01-02'))).toBe('Jeudi 31 décembre');
    expect(formatWhen(at('2026-12-20T09:00:00.000Z'), on('2027-01-02'))).toBe('20 décembre 2026');
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
