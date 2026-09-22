import { expect, test } from 'vitest';
import { shapesTheCache } from './artifacts.ts';

/**
 * The persisted cache is thrown away whenever its buster moves, and the buster is a hash of what it reads. What it
 * reads is therefore what may cost every reader a day of reading, and it is pinned here by name.
 */
test('the cache buster reads the contracts that shape what the app caches', () => {
  expect(['article.ts', 'intake.ts', 'prose.ts', 'remote.ts'].every(shapesTheCache)).toBe(true);
});

test('the cache buster reads neither a test nor the answers a capture recorded', () => {
  expect(['article.test.ts', 'recorded.ts'].filter(shapesTheCache)).toEqual([]);
});
