import { describe, expect, expectTypeOf, test } from 'vitest';
import { deepFreeze, isOneOf, isRecord, keysOf } from './records.ts';

describe('keysOf', () => {
  test('lists the keys in order, typed as the keys of the record', () => {
    const record = { b: 1, a: 2 } as const;
    expect(keysOf(record)).toEqual(['b', 'a']);
    expectTypeOf(keysOf(record)).toEqualTypeOf<readonly ('a' | 'b')[]>();
  });
});

describe('isOneOf', () => {
  const COLORS = ['red', 'green'] as const;

  test.each(['red', 'green'])('narrows %s to the union of the list', (value) => {
    expect(isOneOf(COLORS, value)).toBe(true);
    if (isOneOf(COLORS, value)) {
      expectTypeOf(value).toEqualTypeOf<'red' | 'green'>();
    }
  });

  test('refuses a value outside the list, even a prefix or another case', () => {
    expect(['blue', 'gree', 'RED', ''].filter((value) => isOneOf(COLORS, value))).toEqual([]);
  });
});

describe('deepFreeze', () => {
  test('freezes nested objects and arrays, and returns the same value', () => {
    const value = { list: [{ name: 'a' }], symbol: { [Symbol.for('key')]: { deep: true } } };
    expect(deepFreeze(value)).toBe(value);
    expect(Object.isFrozen(value.list)).toBe(true);
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.symbol[Symbol.for('key')])).toBe(true);
  });

  test('leaves primitives untouched', () => {
    expect(deepFreeze('text')).toBe('text');
    expect(deepFreeze(null)).toBe(null);
  });
});

describe('isRecord', () => {
  test('takes an object, and neither a list, nor null, nor a scalar', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([1])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('a')).toBe(false);
  });
});
