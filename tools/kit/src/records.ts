/** Own enumerable string keys of `record`, typed as its keys: the one place a key list is narrowed. */
export const keysOf = <Keyed extends object>(record: Keyed): readonly (keyof Keyed & string)[] =>
  Object.keys(record).filter((key): key is keyof Keyed & string => Object.hasOwn(record, key));

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
