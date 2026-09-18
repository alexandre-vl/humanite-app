import { expect, test } from 'vitest';
import { toInstant } from './time.ts';

test('a summer stamp names an instant two hours before the hour the newsroom wrote', () => {
  expect(toInstant('2026-09-10 08:30')).toBe('2026-09-10T06:30:00.000Z');
});

test('a winter stamp is one hour ahead, not two', () => {
  expect(toInstant('2026-01-15 08:30')).toBe('2026-01-15T07:30:00.000Z');
});

test('the first hour after the clocks go forward is read on the new offset', () => {
  expect(toInstant('2026-03-29 03:30')).toBe('2026-03-29T01:30:00.000Z');
});

test('a stamp of any other shape comes back untouched, for the schema to refuse it', () => {
  expect(toInstant('hier matin')).toBe('hier matin');
});
