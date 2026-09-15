import { expect, test } from 'vitest';
import { binderFindings } from './binder.ts';
import { EMULATOR } from '../config.ts';
import type { HostSample } from './sample.ts';
import { deserializeSample, driftFindings, residueOf, serializeSample } from './sample.ts';

/** A sample holding the clean value of every write a user can read, with `overrides`. */
const sample = (overrides: Readonly<Record<string, string>> = {}): HostSample =>
  new Map(
    Object.entries({
      'procattr\t/proc/sysrq-trigger': '200 0 0',
      'procattr\t/proc/kmsg': '400 0 0',
      'procattr\t/proc/pressure/memory': '666 0 0',
      'procattr\t/proc/slabinfo': '400 0 0',
      'procattr\t/proc/pagetypeinfo': '400 0 0',
      'procattr\t/proc/cmdline': '444 0 0',
      'procattr\t/proc/vmallocinfo': '400 0 0',
      'sysfsattr\t/sys/power/wakeup_count': '644 0 0',
      'sysfsattr\t/sys/power/state': '644 0 0',
      'sysfsattr\t/sys/firmware/acpi/tables': '755 0 0',
      'superopts\t/sys/kernel/debug': 'rw',
      'superopts\t/sys/kernel/tracing': 'rw',
      'mountroot\t/sys/kernel/debug': '700 0 0',
      'mountroot\t/sys/kernel/tracing': '700 0 0',
      'sysctl\t/proc/sys/kernel/modprobe': '/sbin/modprobe',
      'sysctl\t/proc/sys/kernel/hung_task_timeout_secs': '120',
      'sysctl\t/proc/sys/kernel/hung_task_warnings': '10',
      'sysctl\t/proc/sys/kernel/hung_task_check_count': '4194304',
      'sysctl\t/proc/sys/kernel/hung_task_panic': '0',
      'sysctl\t/proc/sys/vm/mmap_min_addr': '65536',
      'sysctl\t/proc/sys/kernel/ns_last_pid': '1000',
      ...overrides,
    }),
  );

test('a clean host holds no residue; a sysctl only root reads is left to arming', () => {
  expect(residueOf(sample())).toEqual([]);
});

test('residue is every readable write of Android whose value is not the one of a clean host', () => {
  const residue = residueOf(
    sample({
      'procattr\t/proc/sysrq-trigger': '220 0 1000',
      'superopts\t/sys/kernel/debug': 'rw,mode=755',
      'sysctl\t/proc/sys/kernel/hung_task_warnings': '65535',
    }),
  );
  expect(residue.map(({ write, value }) => [write.key, value, write.clean])).toEqual([
    ['/proc/sys/kernel/hung_task_warnings', '65535', '10'],
    ['/proc/sysrq-trigger', '220 0 1000', '200 0 0'],
    ['/sys/kernel/debug', 'rw,mode=755', 'rw'],
  ]);
});

test('drift is every entry both samples hold with another value, the volatile sysctls aside', () => {
  const before = sample();
  const after = sample({ 'sysctl\t/proc/sys/kernel/ns_last_pid': '2000', 'procattr\t/proc/kmsg': '440 0 1000' });
  expect(driftFindings(before, after).map((finding) => finding.message)).toEqual([
    'procattr /proc/kmsg : 400 0 0 → 440 0 1000',
  ]);
  expect(deserializeSample(serializeSample(before))).toEqual(before);
});

test('binder must be loaded with the configured devices, each a character device open to all', () => {
  const nodes = new Map(
    Object.keys(EMULATOR.binder.devices).map((device) => [`/dev/${device}`, { character: true, mode: 0o666 }] as const),
  );
  expect(binderFindings({ devices: 'binder1,binder2,binder3', nodes }, EMULATOR)).toEqual([]);
  const broken = binderFindings(
    {
      devices: null,
      nodes: new Map([...nodes, ['/dev/binder2', null], ['/dev/binder3', { character: true, mode: 0o600 }]]),
    },
    EMULATOR,
  );
  expect(broken.map((finding) => finding.message)).toEqual([
    'binder_linux : non chargé, attendu chargé avec devices=binder1,binder2,binder3',
    '/dev/binder2 : absent, attendu un périphérique caractère en 666',
    '/dev/binder3 : mode 600, attendu un périphérique caractère en 666',
  ]);
});
