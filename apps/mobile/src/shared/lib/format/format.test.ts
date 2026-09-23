import { describe, expect, it } from '@jest/globals';
import { asDisplayText } from '../display-text';
import { formatByline, formatClockTime, formatDayDate, formatDayLabel, formatLongDate, formatPublished } from './index';

describe('formatClockTime', () => {
  it('imprime l’heure que porte une ligne du fil, et rien du jour au-dessus', () => {
    expect(formatClockTime('2026-09-12T17:52:00.000Z')).toBe('19:52');
  });

  it('complète d’un zéro les deux moitiés d’une petite heure', () => {
    expect(formatClockTime('2026-09-12T22:05:00.000Z')).toBe('00:05');
  });

  // The hour is the newsroom's, like every other reading here: an instant filed just before Paris midnight shows the
  // hour Paris was on, under the head of the day Paris was on.
  it('lit l’heure de Paris, donc une fin de soirée passe minuit avec elle', () => {
    expect(formatClockTime('2026-09-12T23:30:00.000Z')).toBe('01:30');
  });
});

// The calendar day an instant falls on is held by `issueIdAt` in the contracts, beside the brand whose own words say
// it is the key a wire groups its runs under. It was computed twice, here and in the content package, from two clocks.

describe('formatDayDate', () => {
  it('date une couverture par son jour et son mois, sans le jour de la semaine', () => {
    expect(formatDayDate('2026-09-12T17:52:00.000Z')).toBe('12 septembre');
  });

  it('lit la date de Paris, donc une fin de soirée date du lendemain', () => {
    expect(formatDayDate('2026-09-12T22:30:00.000Z')).toBe('13 septembre');
  });

  /**
   * A cover has 124 points of room for this, measured on an A065; the four days the paper has printed are the four
   * this has to fit, and the longest of them is what pushed the weekday off in the first place.
   */
  it('tient dans la largeur d’une couverture pour chacun des jours parus', () => {
    const days = ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'].map((day) =>
      formatDayDate(`${day}T09:00:00.000Z`),
    );
    expect(days).toEqual(['10 septembre', '11 septembre', '12 septembre', '13 septembre']);
    expect(Math.max(...days.map((day) => day.length))).toBeLessThan('dimanche 13 septembre'.length);
  });
});

describe('formatLongDate', () => {
  it('date un article de son jour, de son mois et de son année', () => {
    expect(formatLongDate('2026-09-13T09:00:00.000Z')).toBe('13 septembre 2026');
  });

  /** The Paris day, like every other reading of the clock: an article filed at 00:30 in Paris is that day's. */
  it('lit le jour à l’heure de Paris, donc un article du soir tard date du lendemain', () => {
    expect(formatLongDate('2026-12-31T23:30:00.000Z')).toBe('1er janvier 2027');
  });

  /** It is the one date the paper writes out, and the one that carries a year: nothing else here does both. */
  it('porte l’année, que nulle autre date du journal ne porte', () => {
    expect(formatLongDate('2026-09-13T09:00:00.000Z')).toContain('2026');
    expect(formatDayLabel('2026-09-13T09:00:00.000Z')).not.toContain('2026');
    expect(formatDayDate('2026-09-13T09:00:00.000Z')).not.toContain('2026');
  });
});

describe('formatDayLabel', () => {
  it('ouvre une série par son jour de la semaine, son jour et son mois', () => {
    expect(formatDayLabel('2026-09-12T17:52:00.000Z')).toBe('samedi 12 septembre');
  });

  it('lit le jour de la semaine à l’heure de Paris, donc une fin de soirée ouvre le lendemain', () => {
    expect(formatDayLabel('2026-09-12T22:30:00.000Z')).toBe('dimanche 13 septembre');
  });

  it('laisse sans zéro un jour d’un seul chiffre', () => {
    expect(formatDayLabel('2026-01-01T09:00:00.000Z')).toBe('jeudi 1er janvier');
  });

  it('nomme chaque mois', () => {
    const months = [...Array.from({ length: 12 }).keys()].map((index) =>
      formatDayLabel(`2026-${String(index + 1).padStart(2, '0')}-15T09:00:00.000Z`),
    );
    expect(months).toEqual([
      'jeudi 15 janvier',
      'dimanche 15 février',
      'dimanche 15 mars',
      'mercredi 15 avril',
      'vendredi 15 mai',
      'lundi 15 juin',
      'mercredi 15 juillet',
      'samedi 15 août',
      'mardi 15 septembre',
      'jeudi 15 octobre',
      'dimanche 15 novembre',
      'mardi 15 décembre',
    ]);
  });
});

describe('formatPublished', () => {
  /** The hour on the newsroom's clock, written the French way, its letter held to its numbers. */
  it('écrit le jour et l’heure où l’article a paru, à l’heure de Paris', () => {
    expect(formatPublished('2026-09-23T04:57:00.000Z')).toBe('23 septembre 2026 à 6\u00A0h\u00A057');
    expect(formatPublished('2026-09-01T10:05:00.000Z')).toBe('1er septembre 2026 à 12\u00A0h\u00A005');
  });
});

describe('formatByline', () => {
  /** The newsroom signing as a whole is not a name, and French writes it in the lower case after the word before it. */
  it('signe au nom d’une personne, et au nom de la rédaction en minuscule', () => {
    expect(formatByline(asDisplayText('Lisa Guillemin'))).toBe('Par Lisa Guillemin');
    expect(formatByline(asDisplayText('La rédaction'))).toBe('Par la rédaction');
  });
});

describe('un instant que rien ne sait lire', () => {
  it('est refusé plutôt qu’imprimé comme une valeur égarée', () => {
    expect(() => formatLongDate('hier matin')).toThrow(/instant invalide/u);
  });
});
