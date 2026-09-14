/**
 * Maps `items` with at most `concurrency` calls of `map` in flight; results keep the order of `items`. The first
 * rejection is thrown once the calls in flight settle, and no new call starts after it.
 */
export async function mapConcurrently<Item, Result>(
  items: readonly Item[],
  concurrency: number,
  map: (item: Item, index: number) => Promise<Result>,
): Promise<readonly Result[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`Concurrence invalide : ${String(concurrency)}`);
  }
  const results = new Map<number, Readonly<{ value: Result }>>();
  const pending = items.entries();
  let failed = false;
  const work = async (): Promise<void> => {
    for (const [index, item] of pending) {
      if (failed) {
        return;
      }
      try {
        results.set(index, { value: await map(item, index) });
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  const settled = await Promise.allSettled(Array.from({ length: Math.min(concurrency, items.length) }, work));
  const rejection = settled.find((outcome) => outcome.status === 'rejected');
  if (rejection !== undefined) {
    throw rejection.reason;
  }
  return items.map((item, index) => {
    const result = results.get(index);
    if (result === undefined) {
      throw new Error(`Résultat manquant pour l’élément ${String(index)}`);
    }
    return result.value;
  });
}
