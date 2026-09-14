import { describe, expect, test } from 'vitest';
import type { SimpleCommand } from './commands.ts';
import { argv, readCommands } from './commands.ts';

const CONTEXT = { home: '/home/agent' };

const lines = (line: string): readonly string[] =>
  readCommands(line, CONTEXT).map((command) => argv(command).join(' '));

const unknownWords = (command: SimpleCommand | undefined): readonly string[] =>
  (command?.words ?? [])
    .filter((word) => word.pieces.some((piece) => piece.kind === 'unknown'))
    .map((word) => word.text);

describe('readCommands', () => {
  test('separates leading assignments and peels wrappers off', () => {
    const commands = readCommands('LANG=C timeout 5 nice -n 10 pnpm test', CONTEXT);
    expect(commands.map((command) => argv(command).join(' '))).toEqual([
      'timeout 5 nice -n 10 pnpm test',
      'nice -n 10 pnpm test',
      'pnpm test',
    ]);
    expect(commands.map((command) => command.assignments.map((assignment) => assignment.name))).toEqual([
      ['LANG'],
      ['LANG'],
      ['LANG'],
    ]);
  });

  test('expands braces, sequences and the home directory', () => {
    expect(lines('echo {a,b}{1..2} x{,y} {c..a} ~/f "~/g" {z}')).toEqual([
      'echo a1 a2 b1 b2 x xy c b a /home/agent/f ~/g {z}',
    ]);
  });

  test('gives variables the values the line assigns, split into fields outside quotes', () => {
    expect(lines('x="a b"; y=$x; rm $x "$y" $IFS "${IFS}"; git${IFS}status')).toEqual([
      '',
      '',
      'rm a b a b  ',
      'git status',
    ]);
  });

  test('keeps unknown expansions as written', () => {
    const echo = readCommands('echo $HOME/x "$(date)" $1', CONTEXT).find((command) => argv(command)[0] === 'echo');
    expect(unknownWords(echo)).toEqual(['$HOME/x', '$(date)', '$1']);
  });

  test('runs a loop body once per value, patterns kept for the reader of the files', () => {
    const commands = readCommands('for f in a *.md; do rm "$f"; done', CONTEXT);
    expect(commands.map((command) => argv(command).join(' '))).toEqual(['rm a', 'rm *.md']);
    expect(commands[1]?.words[1]?.pieces).toEqual([{ kind: 'text', text: '*.md', pattern: true }]);
  });

  test('drops reserved words, function headers and constructs that run nothing', () => {
    expect(lines('if true; then ! git status; fi; f() { ls; }; case $x in a) pwd;; esac; [[ -f a ]]')).toEqual([
      'true',
      'git status',
      'f',
      'ls',
      'pwd',
    ]);
  });

  test('reads the commands of shells, eval, env -S, find -exec, xargs and package runners', () => {
    expect(
      lines(
        [
          "bash -lc 'git status'",
          "sh <<'EOF'\ngit log\nEOF",
          'eval git diff',
          "env -S 'git show' -u X",
          String.raw`find . -exec git add {} \;`,
          'xargs -n 1 git rm',
          'pnpm --filter x exec git fetch',
          'watch -n 1 git branch',
        ].join('\n'),
      ),
    ).toEqual(
      expect.arrayContaining([
        'git status',
        'git log',
        'git diff',
        'git show',
        'git add {}',
        'git rm',
        'git fetch',
        'git branch',
      ]),
    );
  });

  test('runs nested substitutions before the command that holds them', () => {
    expect(lines('echo "$(git rev-parse HEAD)" `whoami`')).toEqual([
      'git rev-parse HEAD',
      'whoami',
      'echo $(git rev-parse HEAD) `whoami`',
    ]);
  });

  test('gives here-document input its content when known', () => {
    const [known, unknown] = readCommands("cat <<'EOF'\n$x\nEOF\ncat <<EOF\n$x\nEOF", CONTEXT);
    expect(known?.redirections).toEqual([{ kind: 'text', source: '$x\n', content: '$x\n' }]);
    expect(unknown?.redirections).toEqual([{ kind: 'text', source: '$x\n', content: null }]);
  });
});
