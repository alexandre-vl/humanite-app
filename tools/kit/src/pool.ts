/** Maps `items` with at most `concurrency` calls of `map` in flight; results keep the order of `items`. */
export async function mapConcurrently<Item, Result>(
  items: readonly Item[],
  concurrency: number,
  map: (item: Item, index: number) => Promise<Result>,
): Promise<readonly Result[]> {
  const results = new Map<number, Result>();
  let cursor = 0;
  const work = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) {
        results.set(index, await map(item, index));
      }
    }
  };
  const workers = Math.max(1, Math.min(Math.floor(concurrency), items.length));
  await Promise.all(Array.from({ length: workers }, work));
  return [...items.keys()].flatMap((index) => {
    const result = results.get(index);
    return result === undefined ? [] : [result];
  });
}
