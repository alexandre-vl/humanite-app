import { expect, test } from 'vitest';
import { judgeIntake, readSummaries } from './index.ts';

/**
 * The judging answers whether a reading holds the rule, on a sample written for the purpose. What the reading makes
 * of the answers the journal's service actually sent is measured beside the client that asks for them, in the
 * package that keeps those answers.
 */
test('the reading of this module serves what it reads, all of it, in order, and names the rest', () => {
  expect(judgeIntake(readSummaries)).toEqual([]);
});
