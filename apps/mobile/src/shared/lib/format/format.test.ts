import { describe, expect, it } from '@jest/globals';
import { formatDate, formatDateTime, formatDayKey, formatDayLabel, formatDuration, formatRelativeTime } from './index';

const NOW = Date.parse('2026-09-13T09:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The instant a given span before the fixed now, as the contracts carry it. */
const ago = (millis: number): string => new Date(NOW - millis).toISOString();

describe('formatDate', () => {
  it('prints the day the newsroom published on', () => {
    expect(formatDate('2026-09-12T17:52:00.000Z')).toBe('12/09/2026');
  });

  it('reads the newspaper clock, not UTC: an evening in Paris is already the next day', () => {
    expect(formatDate('2026-09-12T22:30:00.000Z')).toBe('13/09/2026');
  });
});

describe('formatDateTime', () => {
  it('prints the day and the hour a timeline row carries', () => {
    expect(formatDateTime('2026-09-12T17:52:00.000Z')).toBe('12/09, 19:52');
  });

  it('pads both halves of a small hour', () => {
    expect(formatDateTime('2026-09-12T22:05:00.000Z')).toBe('13/09, 00:05');
  });
});

describe('formatDayKey', () => {
  it('names the calendar day an instant falls on', () => {
    expect(formatDayKey('2026-09-12T17:52:00.000Z')).toBe('2026-09-12');
  });

  it('tells two runs apart by the newsroom day, not the UTC one', () => {
    expect(formatDayKey('2026-09-12T22:30:00.000Z')).toBe('2026-09-13');
    expect(formatDayKey('2026-09-12T21:30:00.000Z')).toBe('2026-09-12');
  });

  it('pads both halves so the key of a small month still sorts', () => {
    expect(formatDayKey('2026-01-05T09:00:00.000Z')).toBe('2026-01-05');
  });
});

describe('formatDayLabel', () => {
  it('heads a run with its weekday, its day and its month', () => {
    expect(formatDayLabel('2026-09-12T17:52:00.000Z')).toBe('samedi 12 septembre');
  });

  it('reads the weekday from the Paris date, so a late evening heads the next day', () => {
    expect(formatDayLabel('2026-09-12T22:30:00.000Z')).toBe('dimanche 13 septembre');
  });

  it('leaves a single-figure day unpadded', () => {
    expect(formatDayLabel('2026-01-01T09:00:00.000Z')).toBe('jeudi 1 janvier');
  });

  it('names every month', () => {
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

describe('formatRelativeTime', () => {
  it('holds the first minute at the present, ahead of it too', () => {
    expect(formatRelativeTime(ago(30_000), NOW)).toBe("à l'instant");
    expect(formatRelativeTime(ago(-MINUTE), NOW)).toBe("à l'instant");
  });

  it('counts minutes, then hours, each floored', () => {
    expect(formatRelativeTime(ago(5 * MINUTE + 40_000), NOW)).toBe('il y a 5 min');
    expect(formatRelativeTime(ago(59 * MINUTE), NOW)).toBe('il y a 59 min');
    expect(formatRelativeTime(ago(HOUR), NOW)).toBe('il y a 1 h');
    expect(formatRelativeTime(ago(23 * HOUR), NOW)).toBe('il y a 23 h');
  });

  it('turns the plural of a day at two, as French does', () => {
    expect(formatRelativeTime(ago(DAY), NOW)).toBe('il y a 1 jour');
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe('il y a 2 jours');
    expect(formatRelativeTime(ago(6 * DAY), NOW)).toBe('il y a 6 jours');
  });

  it('gives up on the relative form after a week and prints the date', () => {
    expect(formatRelativeTime(ago(8 * DAY), NOW)).toBe('05/09/2026');
  });
});

describe('formatDuration', () => {
  it('prints a running time as a player does', () => {
    expect(formatDuration(258)).toBe('4:18');
    expect(formatDuration(45)).toBe('0:45');
  });

  it('carries the hour when there is one', () => {
    expect(formatDuration(3858)).toBe('1:04:18');
  });
});

describe('an instant nothing can read', () => {
  it('is refused rather than printed as a stray value', () => {
    expect(() => formatDate('hier matin')).toThrow(/instant invalide/u);
  });
});
