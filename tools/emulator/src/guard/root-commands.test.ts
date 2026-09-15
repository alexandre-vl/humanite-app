import { shellLine } from '@huma/kit/cli';
import { expect, test } from 'vitest';
import { emulatorFinding } from '../checks.ts';
import { EMULATOR } from '../config.ts';
import { ROOT_SOURCE } from '../sources.ts';
import {
  armCommands,
  binderCommands,
  disarmCommands,
  installCommands,
  installRemedy,
  repairCommands,
} from './root-commands.ts';

const ALL = [
  installCommands('/work/humanite', EMULATOR),
  armCommands(EMULATOR),
  disarmCommands(EMULATOR),
  binderCommands(EMULATOR),
  repairCommands(EMULATOR),
];

test('root commands name every path in full: a shell would expand a pattern before sudo runs', () => {
  for (const command of ALL.flatMap((each) => each.commands)) {
    expect(command[0]).toBe('sudo');
    expect(shellLine(command)).not.toMatch(/(?<!')[*?[\]](?!')/u);
  }
});

test('the guard installs only from a commit: an uncommitted file leaves nothing to install', () => {
  const uncommitted = emulatorFinding('emulator/guard-uncommitted', ROOT_SOURCE, {});
  const missing = emulatorFinding('emulator/guard-install', ROOT_SOURCE, { file: 'lib.sh', state: 'absent' });
  expect(installRemedy('/work/humanite', EMULATOR, [missing, uncommitted])).toBeNull();
  expect(installRemedy('/work/humanite', EMULATOR, [missing])).toEqual(installCommands('/work/humanite', EMULATOR));
});

test('what writes the kernel is a script of the guard, never a shell the tooling composed', () => {
  const programs = [armCommands(EMULATOR), disarmCommands(EMULATOR), repairCommands(EMULATOR)]
    .flatMap((each) => each.commands)
    .map((command) => command.slice(1));
  expect(programs).toEqual([
    [`${EMULATOR.guard.installDirectory}/arm.sh`],
    [`${EMULATOR.guard.installDirectory}/disarm.sh`],
    [`${EMULATOR.guard.installDirectory}/arm.sh`, '--repair'],
  ]);
});
