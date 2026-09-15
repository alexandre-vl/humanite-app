import { expect, test } from 'vitest';
import { parseGuardStatus, STATUS_FORMAT } from './status.ts';

const STATUS = [
  `format\t${STATUS_FORMAT}`,
  'boot_id\tc782471d-2ec0-48ae-af2b-d25ccc4cf445',
  'armed_at\t1789452000',
  'phase\trestored',
  'mode\tboot',
  'container\trunning\t2026-09-15T08:00:00.000000000Z',
  'restored_started_at\t2026-09-15T08:00:00.000000000Z',
  'run_end\t1789452100',
  'script\tlib.sh\te3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'change\trevert\tsysctl\t/proc/sys/kernel/modprobe\t/sbin/modprobe\t',
  'change\tpending\ttracefs-instance\tbootreceiver\t<absent>\tpresent',
  'remaining\trevert\tsysctl\t/proc/sys/kernel/kptr_restrict\t0\t2',
  'failure\t1789452099\tboot\tnot-restored\t sysctl:/proc/sys/kernel/kptr_restrict',
  '',
].join('\n');

test('reads every record of a status, empty values included', () => {
  const status = parseGuardStatus(STATUS);
  expect(status).toMatchObject({
    bootId: 'c782471d-2ec0-48ae-af2b-d25ccc4cf445',
    armedAt: 1_789_452_000,
    phase: 'restored',
    mode: 'boot',
    container: { status: 'running', startedAt: '2026-09-15T08:00:00.000000000Z' },
    restoredStartedAt: '2026-09-15T08:00:00.000000000Z',
    runEnd: 1_789_452_100,
    failures: [
      { at: 1_789_452_099, mode: 'boot', reason: 'not-restored', detail: ' sysctl:/proc/sys/kernel/kptr_restrict' },
    ],
  });
  expect(status.changes).toEqual([
    { action: 'revert', kind: 'sysctl', key: '/proc/sys/kernel/modprobe', was: '/sbin/modprobe', is: '' },
    { action: 'pending', kind: 'tracefs-instance', key: 'bootreceiver', was: '<absent>', is: 'present' },
  ]);
  expect(status.remaining).toHaveLength(1);
  expect(status.scripts.get('lib.sh')).toMatch(/^e3b0/u);
});

test('refuses another format, an unknown phase and a missing field', () => {
  expect(() => parseGuardStatus(STATUS.replace(STATUS_FORMAT, 'humanite-redroid-status/0'))).toThrow('format');
  expect(() => parseGuardStatus(STATUS.replace('phase\trestored', 'phase\tdone'))).toThrow('phase « done » inconnu');
  expect(() => parseGuardStatus(STATUS.replace(/^run_end.*$/mu, ''))).toThrow('run_end absent');
});
