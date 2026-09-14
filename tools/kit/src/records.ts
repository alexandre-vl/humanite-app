/** Own enumerable string keys of `record`, typed as its keys: the one place a key list is narrowed. */
export const keysOf = <Keyed extends object>(record: Keyed): readonly (keyof Keyed & string)[] =>
  Object.keys(record).filter((key): key is keyof Keyed & string => Object.hasOwn(record, key));
