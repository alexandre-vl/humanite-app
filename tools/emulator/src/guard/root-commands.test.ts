import { shellLine } from '@huma/kit/cli';
import { expect, test } from 'vitest';
import { ANDROID_WRITES } from '../android-writes.ts';
import { EMULATOR } from '../config.ts';
import type { Residual } from '../host/sample.ts';
import { armCommands, binderCommands, disarmCommands, installCommands, residueCommands } from './root-commands.ts';

const residual = (key: string, value: string): Residual => {
  const write = ANDROID_WRITES.find((candidate) => candidate.key === key);
  if (write?.clean === undefined || write.clean === null) {
    throw new Error(key);
  }
  return { write, value, clean: write.clean };
};

test('root commands name every path in full: a shell would expand a pattern before sudo runs', () => {
  const commands = [
    installCommands('/work/humanite', EMULATOR),
    armCommands(EMULATOR),
    disarmCommands(EMULATOR),
    binderCommands(EMULATOR),
    residueCommands([residual('/proc/sysrq-trigger', '220 0 1000')]),
  ].flatMap((each) => each?.commands ?? []);
  for (const command of commands) {
    expect(command[0]).toBe('sudo');
    expect(shellLine(command)).not.toMatch(/(?<!')[*?[\]](?!')/u);
  }
});

test('residue is given back in one root shell, each entry to the value of a clean host', () => {
  const commands = residueCommands([
    residual('/proc/sysrq-trigger', '220 0 1000'),
    residual('/proc/sys/kernel/hung_task_warnings', '65535'),
    residual('/sys/kernel/debug', 'rw,mode=755'),
  ]);
  expect(commands?.commands).toEqual([
    [
      'sudo',
      'sh',
      '-c',
      'chown 0:0 /proc/sysrq-trigger && chmod 200 /proc/sysrq-trigger && echo 10 > /proc/sys/kernel/hung_task_warnings && mount -o remount,uid=0,gid=0,mode=700 /sys/kernel/debug',
    ],
  ]);
  expect(residueCommands([])).toBeNull();
});
