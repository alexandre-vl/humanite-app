import { expect, test } from 'vitest';
import { judgeProse, readPlain, readProse } from './index.ts';

/**
 * The judging answers whether the readings of this module leave a screen only prose, on a body written for the
 * purpose. What they make of the bodies and the lines the journal actually filed is measured beside the client that
 * asks for them, in the package that keeps those answers.
 */
test('the readings of this module leave a screen nothing but text a reader should see', () => {
  expect(judgeProse({ prose: readProse, plain: readPlain })).toEqual([]);
});
