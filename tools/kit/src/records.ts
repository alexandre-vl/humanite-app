import { isList, isRecord } from '@huma/unknown';

/** Own enumerable string keys of `record`, typed as its keys: the one place a key list is narrowed. */
export const keysOf = <Keyed extends object>(record: Keyed): readonly (keyof Keyed & string)[] =>
  Object.keys(record).filter((key): key is keyof Keyed & string => Object.hasOwn(record, key));

/** Whether `value` is one of `values`: the one place a string is narrowed to a union declared as a list. */
export const isOneOf = <const Value extends string>(values: readonly Value[], value: string): value is Value =>
  values.some((candidate) => candidate === value);

/** `value` frozen with every record and list it holds: data declared once can then never be changed by a caller. */
export function deepFreeze<Value>(value: Value): Value {
  if ((isRecord(value) || isList(value)) && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(Reflect.get(value, key));
    }
  }
  return value;
}
