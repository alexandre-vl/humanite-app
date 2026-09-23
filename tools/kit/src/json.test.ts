import { isRecord } from '@huma/unknown';
import { expect, test } from 'vitest';
import { arrayField, objectField, parseJson, stringField } from './json.ts';

test('parseJson never throws', () => {
  expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  expect(parseJson('{')).toBeUndefined();
});

test('field readers return null for a missing or mistyped field', () => {
  const value = parseJson('{"text":"b","count":1,"nested":{"x":true},"list":[1]}');
  if (!isRecord(value)) {
    throw new Error('the parse is not a record: the readers would be checked against nothing');
  }
  expect(stringField(value, 'text')).toBe('b');
  expect(stringField(value, 'count')).toBeNull();
  expect(objectField(value, 'nested')).toEqual({ x: true });
  expect(objectField(value, 'list')).toBeNull();
  expect(arrayField(value, 'list')).toEqual([1]);
  expect(arrayField(value, 'nested')).toBeNull();
});
