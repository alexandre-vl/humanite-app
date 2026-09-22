/** Own enumerable string keys of `record`, typed as its keys: the one place a key list is narrowed. */
export const keysOf = <Keyed extends object>(record: Keyed): readonly (keyof Keyed & string)[] =>
  Object.keys(record).filter((key): key is keyof Keyed & string => Object.hasOwn(record, key));

/** Whether `value` is one of `values`: the one place a string is narrowed to a union declared as a list. */
export const isOneOf = <const Value extends string>(values: readonly Value[], value: string): value is Value =>
  values.some((candidate) => candidate === value);

/**
 * Whether `value` is an object whose fields can be read by name, and not a list: the one place an unknown — a parse,
 * a file, an answer — is narrowed to a record before any field of it is read.
 */
export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `value` frozen with every object it holds: data declared once can then never be changed by a caller. */
export function deepFreeze<Value>(value: Value): Value {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(Reflect.get(value, key));
    }
  }
  return value;
}
