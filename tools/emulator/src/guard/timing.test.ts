import { expect, test } from 'vitest';
import { EMULATOR } from '../config.ts';
import { renderTrackedTable } from './tracked.ts';
import {
  dockerLockWaitSeconds,
  guardLockWaitSeconds,
  guardRunTimeoutSeconds,
  guardStaleSeconds,
  guardWorkSeconds,
} from './timing.ts';

test('each side of the lock waits at least as long as the other may hold it', () => {
  // A run of the guard that gave up on the lock would leave the host unrestored and its status stale.
  expect(guardLockWaitSeconds(EMULATOR)).toBeGreaterThanOrEqual(EMULATOR.guard.containerChangeSeconds);
  // `docker run` and `docker rm` that gave up would leave the command with no container and no reason.
  expect(dockerLockWaitSeconds(EMULATOR)).toBeGreaterThanOrEqual(guardWorkSeconds(EMULATOR));
  // A run that spends its whole budget waiting, then works, still ends before the guard counts as stale.
  expect(guardStaleSeconds(EMULATOR)).toBeGreaterThan(guardRunTimeoutSeconds(EMULATOR));
});

test('the guard reads the same waits as the commands, from the table', () => {
  const rows = renderTrackedTable(EMULATOR)
    .split('\n')
    .map((line) => line.split('\t'));
  expect(rows).toContainEqual(['setting', 'lock_wait_s', String(guardLockWaitSeconds(EMULATOR))]);
  expect(rows).toContainEqual(['setting', 'run_timeout_s', String(guardRunTimeoutSeconds(EMULATOR))]);
});
