import { expect, test } from 'vitest';
import { shapesTheCache } from './artifacts.ts';

/**
 * The persisted cache is thrown away whenever its buster moves, and the buster is a hash of what it reads. What it
 * reads is therefore what may cost every reader a day of reading, and it is pinned here by name.
 */
test('the cache buster reads the contracts that shape what the app caches', () => {
  expect(['article.ts', 'intake.ts', 'prose.ts', 'remote.ts'].every(shapesTheCache)).toBe(true);
});

/** The answers a capture recorded are not among the contracts at all: they live beside the client that asks for them. */
test('the cache buster reads no test', () => {
  expect(['article.test.ts', 'intake.test.ts'].filter(shapesTheCache)).toEqual([]);
});
