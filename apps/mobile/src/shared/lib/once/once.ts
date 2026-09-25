/**
 * The items of a run, each once, where it first came.
 *
 * An item is who its key says it is, so an item under a key already read is the same item read again, and is dropped.
 * A run in which nothing comes twice is handed back as it came, the same array, so whatever holds on to it for as
 * long as it does not change goes on holding on to it.
 */
export const onceEach = <Item>(items: readonly Item[], keyOf: (item: Item) => string): readonly Item[] => {
  const seen = new Set<string>();
  const kept: Item[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      kept.push(item);
    }
  }
  return kept.length === items.length ? items : kept;
};
