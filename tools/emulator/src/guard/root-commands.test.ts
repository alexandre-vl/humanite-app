import { shellLine } from '@huma/kit/cli';
import { expect, test } from 'vitest';
import { EMULATOR } from '../config.ts';
import { armCommands, binderCommands, disarmCommands, installCommands, repairCommands } from './root-commands.ts';

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
