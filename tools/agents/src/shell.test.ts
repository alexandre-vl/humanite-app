import { expect, test } from 'vitest';
import { simpleCommands } from './shell.ts';

const words = (line: string): readonly string[] => simpleCommands(line).map((command) => command.words.join(' '));

test('splits on operators and keeps quoted words whole', () => {
  expect(words(`git add -A && git commit -m "feat: deux mots" ; echo 'a;b' | cat`)).toEqual([
    'git add -A',
    'git commit -m feat: deux mots',
    'echo a;b',
    'cat',
  ]);
});

test('separates leading assignments and peels wrappers off', () => {
  expect(simpleCommands('LANG=C timeout 5 nice -n 10 pnpm test')).toEqual([
    { assignments: ['LANG=C'], words: ['timeout', '5', 'nice', '-n', '10', 'pnpm', 'test'] },
    { assignments: ['LANG=C'], words: ['nice', '-n', '10', 'pnpm', 'test'] },
    { assignments: ['LANG=C'], words: ['pnpm', 'test'] },
  ]);
});

test('descends into sh -c scripts, command substitutions and backticks', () => {
  expect(words(`bash -c 'pnpm adr:check && git status'`)).toContain('pnpm adr:check');
  expect(words('echo $(git rev-parse HEAD) `whoami`')).toEqual([
    'echo $(git rev-parse HEAD) `whoami`',
    'git rev-parse HEAD',
    'whoami',
  ]);
});

test('reads env options before the wrapped command', () => {
  expect(words('env -u CLAUDECODE FOO=1 pnpm adr:check')).toEqual([
    'env -u CLAUDECODE FOO=1 pnpm adr:check',
    'pnpm adr:check',
  ]);
});
