import { expect, test } from 'vitest';
import { issueIdAt, NEWSROOM_ZONE } from './clock.ts';
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
