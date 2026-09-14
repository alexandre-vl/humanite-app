import { expect, test } from 'vitest';
import { arrayField, isJsonObject, objectField, parseJson, stringField } from './json.ts';

test('parseJson never throws', () => {
  expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  expect(parseJson('{')).toBeUndefined();
});

test('field readers return null for a missing or mistyped field', () => {
  const value = parseJson('{"text":"b","count":1,"nested":{"x":true},"list":[1]}');
  expect(isJsonObject(value)).toBe(true);
  if (!isJsonObject(value)) {
    return;
  }
  expect(stringField(value, 'text')).toBe('b');
  expect(stringField(value, 'count')).toBeNull();
  expect(objectField(value, 'nested')).toEqual({ x: true });
  expect(objectField(value, 'list')).toBeNull();
  expect(arrayField(value, 'list')).toEqual([1]);
  expect(isJsonObject([])).toBe(false);
  expect(isJsonObject(null)).toBe(false);
});
