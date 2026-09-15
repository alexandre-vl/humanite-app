import { expect, test } from 'vitest';
import { EMULATOR } from '../config.ts';
import type { GuardObservation } from './observe.ts';
import { currentStatus, guardProblems } from './observe.ts';
import type { GuardStatus } from './status.ts';

const BOOT = 'c782471d-2ec0-48ae-af2b-d25ccc4cf445';

const STATUS: GuardStatus = {
  bootId: BOOT,
  armedAt: 1_000,
  phase: 'idle',
  mode: 'idle',
  container: { status: 'absent', startedAt: null },
  restoredStartedAt: null,
  runEnd: 1_100,
  scripts: new Map([
    ['arm.sh', 'a'],
    ['guard.sh', 'g'],
    ['disarm.sh', 'd'],
    ['lib.sh', 'l'],
    ['tracked.tsv', 't'],
  ]),
  changes: [],
  remaining: [],
  failures: [],
};

const observation = (overrides: Partial<GuardObservation> = {}): GuardObservation => ({
  status: STATUS,
  bootId: BOOT,
  now: 1_120,
  timer: { loadState: 'loaded', activeState: 'active' },
  installed: new Map([
    ['arm.sh', 'a'],
    ['guard.sh', 'g'],
    ['disarm.sh', 'd'],
    ['lib.sh', 'l'],
    ['tracked.tsv', 't'],
  ]),
  ...overrides,
});

const codes = (overrides: Partial<GuardObservation>): readonly string[] =>
  guardProblems(observation(overrides), EMULATOR).map((finding) => finding.code);

test('an armed guard of this boot, running with the files it was armed with, raises nothing', () => {
  expect(codes({})).toEqual([]);
  expect(currentStatus(observation())).toBe(STATUS);
});

test('names what keeps the guard from protecting a session', () => {
  expect(codes({ timer: { loadState: 'not-found', activeState: 'inactive' }, status: null })).toEqual([
    'emulator/guard-timer',
    'emulator/guard-status',
  ]);
  expect(codes({ status: { unreadable: 'statut du garde : format inconnu' } })).toEqual(['emulator/guard-status']);
  expect(codes({ bootId: 'another-boot' })).toEqual(['emulator/guard-status']);
  expect(codes({ now: 1_100 + EMULATOR.guard.tickSeconds + EMULATOR.guard.runTimeoutSeconds + 1 })).toEqual([
    'emulator/guard-stale',
  ]);
  expect(codes({ installed: new Map([...observation().installed, ['lib.sh', 'changed']]) })).toEqual([
    'emulator/guard-scripts',
  ]);
  const failed: GuardStatus = {
    ...STATUS,
    failures: [{ at: 1_050, mode: 'boot', reason: 'unattributed', detail: ' sysctl:/proc/sys/vm/swappiness' }],
  };
  expect(codes({ status: failed })).toEqual(['root/unattributed']);
  expect(currentStatus(observation({ bootId: 'another-boot' }))).toBeNull();
});
