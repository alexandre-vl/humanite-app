import { expect, expectTypeOf, test } from 'vitest';
import { isList, isRecord } from './unknown.ts';

test('isRecord takes an object, and neither a list, nor null, nor a scalar', () => {
  expect(isRecord({})).toBe(true);
  expect(isRecord({ a: 1 })).toBe(true);
  expect(isRecord([1])).toBe(false);
  expect(isRecord(null)).toBe(false);
  expect(isRecord(undefined)).toBe(false);
  expect(isRecord('a')).toBe(false);
});

test('isList takes a list, and neither an object shaped like one nor a scalar', () => {
  expect(isList([])).toBe(true);
  expect(isList([1, 'two'])).toBe(true);
  expect(isList({ length: 0 })).toBe(false);
  expect(isList('list')).toBe(false);
  expect(isList(null)).toBe(false);
});

test('isList narrows to a list of unknowns, never to a list of anything', () => {
  const value: unknown = [1];
  if (isList(value)) {
    expectTypeOf(value).toEqualTypeOf<readonly unknown[]>();
  }
});
