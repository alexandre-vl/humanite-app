import { expect, test } from 'vitest';
import { decideStop } from './stop.ts';

test('the stop hook verifies a tree that changed since the last green run, once per stop', () => {
  expect(decideStop({ stopHookActive: false, currentTree: 'a', verifiedTree: null })).toBe('verify');
  expect(decideStop({ stopHookActive: false, currentTree: 'a', verifiedTree: 'b' })).toBe('verify');
  expect(decideStop({ stopHookActive: false, currentTree: 'a', verifiedTree: 'a' })).toBe('allow');
  expect(decideStop({ stopHookActive: true, currentTree: 'a', verifiedTree: 'b' })).toBe('allow');
});
