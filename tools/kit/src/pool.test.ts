import { expect, test } from 'vitest';
import { mapConcurrently } from './pool.ts';

const waiting = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

test('keeps the order of the items and never exceeds the limit', async () => {
  let running = 0;
  let peak = 0;
  const results = await mapConcurrently([30, 1, 10, 5], 2, async (delay, index) => {
    running += 1;
    peak = Math.max(peak, running);
    await waiting(delay);
    running -= 1;
    return index;
  });
  expect(results).toEqual([0, 1, 2, 3]);
  expect(peak).toBe(2);
});

test('handles an empty list, undefined items and undefined results', async () => {
  expect(await mapConcurrently([], 4, async () => Promise.resolve(1))).toEqual([]);
  expect(await mapConcurrently(['a', undefined, 'c'], 2, async (item) => Promise.resolve(item))).toEqual([
    'a',
    undefined,
    'c',
  ]);
});

test('refuses a concurrency that is not a positive integer', async () => {
  for (const concurrency of [0, -1, 1.5, Number.NaN]) {
    await expect(mapConcurrently([1], concurrency, async () => Promise.resolve(1))).rejects.toBeInstanceOf(RangeError);
  }
});

test('throws the first rejection and starts no new call after it', async () => {
  const started: number[] = [];
  const outcome = mapConcurrently([0, 1, 2, 3, 4, 5], 2, async (item) => {
    started.push(item);
    await waiting(item === 0 ? 1 : 20);
    if (item === 0) {
      throw new Error('premier échec');
    }
    return item;
  });
  await expect(outcome).rejects.toThrow('premier échec');
  expect(started).toEqual([0, 1]);
});
