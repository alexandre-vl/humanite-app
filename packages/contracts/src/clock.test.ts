import { expect, test } from 'vitest';
import { clockAt, instantAt, issueIdAt, NEWSROOM_ZONE } from './clock.ts';
import { ISSUE_ID } from './ids.ts';

test('the newsroom keeps one zone, and everything downstream reads it from here', () => {
  expect(NEWSROOM_ZONE).toBe('Europe/Paris');
});

test('an instant is filed under the day the newsroom made that paper', () => {
  expect(issueIdAt('2026-09-12T17:52:00.000Z')).toBe('2026-09-12');
});

/**
 * The reason the zone is not the reader's: an item filed late on a Paris evening belongs to the paper made that night,
 * not to the day UTC had already turned over to. Both sides of Paris midnight are read, so a rule that took the UTC
 * date would fail on one of them.
 */
test('a Paris evening belongs to the day it was filed, not to the one UTC is on', () => {
  expect(issueIdAt('2026-09-12T22:30:00.000Z')).toBe('2026-09-13');
  expect(issueIdAt('2026-09-12T21:30:00.000Z')).toBe('2026-09-12');
});

/** Widest first and both halves padded, so a shelf sorts as a string in the order it reads. */
test('a day of a small month still sorts', () => {
  expect(issueIdAt('2026-01-05T09:00:00.000Z')).toBe('2026-01-05');
  expect(ISSUE_ID.safeParse(issueIdAt('2026-01-05T09:00:00.000Z')).success).toBe(true);
});

/** A run of items would rather stop than be filed under a numéro that does not exist. */
test('an instant nothing can read is refused rather than turned into a day', () => {
  expect(() => issueIdAt('hier matin')).toThrow(RangeError);
});

/**
 * A stamp of the newsroom names a Paris hour, and nothing in it says so. These four were the corpus generator's own
 * tests, when it kept a clock of its own; they moved here with the one clock left.
 */
test('a summer stamp names an instant two hours before the hour the newsroom wrote', () => {
  expect(instantAt('2026-09-10 08:30')).toBe('2026-09-10T06:30:00.000Z');
});

test('a winter stamp is one hour ahead, not two', () => {
  expect(instantAt('2026-01-15 08:30')).toBe('2026-01-15T07:30:00.000Z');
});

test('the first hour after the clocks go forward is read on the new offset', () => {
  expect(instantAt('2026-03-29 03:30')).toBe('2026-03-29T01:30:00.000Z');
});

test('a stamp of any other shape names nothing', () => {
  expect(instantAt('hier matin')).toBeNull();
});

/** The journal's own service writes the same clock in two more hands: with a `T` on its lists, a space on its front. */
test('a stamp of the journal is read in either of the two hands its service writes it in', () => {
  expect(instantAt('2026-09-21T07:00:00')).toBe('2026-09-21T05:00:00.000Z');
  expect(instantAt('2026-09-21 19:21:24')).toBe('2026-09-21T17:21:24.000Z');
});

/** The calendar would roll these into other days rather than refuse them, which is the one thing a reading must not. */
test('a stamp whose fields are out of range names nothing, rather than a day nobody wrote', () => {
  expect(instantAt('2026-13-40 08:30')).toBeNull();
  expect(instantAt('2026-02-30 08:30')).toBeNull();
  expect(instantAt('2026-09-21 24:00')).toBeNull();
});

/** One clock, read the same way whichever reading asks: the instant a stamp names reads back as that stamp. */
test('the newsroom clock reads back an instant as the stamp it was named by', () => {
  const instant = instantAt('2026-09-12 23:45:10');
  expect(instant).not.toBeNull();
  expect(clockAt(Date.parse(instant ?? ''))).toEqual({
    year: 2026,
    month: 9,
    day: 12,
    hour: 23,
    minute: 45,
    second: 10,
  });
  expect(issueIdAt(instant ?? '')).toBe('2026-09-12');
});
