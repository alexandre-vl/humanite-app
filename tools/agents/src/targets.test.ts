import { describe, expect, test } from 'vitest';
import { readCommands } from './shell/commands.ts';
import { literalWord } from './shell/words.ts';
import type { FileSystemView } from './targets.ts';
import { designate, lineDirectories } from './targets.ts';

const DIRECTORIES: Readonly<Record<string, readonly string[]>> = {
  '/r': ['docs', '.git'],
  '/r/docs': ['a.md', 'b.txt', '.hidden.md'],
};

const VIEW: FileSystemView = { listDirectory: async (path) => Promise.resolve(DIRECTORIES[path] ?? null) };

const directoriesOf = (line: string): ReturnType<typeof lineDirectories> =>
  lineDirectories(readCommands(line, { home: '/home/a' }), '/r', '/home/a');

describe('lineDirectories', () => {
  test('follows each cd of the line from every directory reached so far', () => {
    expect(directoriesOf('cd docs && ls; cd ../x')).toEqual({
      known: ['/r', '/r/docs', '/x', '/r/x'],
      uncertain: false,
    });
  });

  test('knows cd without argument goes home, and is uncertain about unknown or previous directories', () => {
    expect(directoriesOf('cd')).toEqual({ known: ['/r', '/home/a'], uncertain: false });
    expect(directoriesOf('cd "$X"').uncertain).toBe(true);
    expect(directoriesOf('cd -').uncertain).toBe(true);
  });
});

describe('designate', () => {
  const known = { known: ['/r'], uncertain: false };

  test('resolves a relative word from each directory, and keeps an absolute one', async () => {
    expect(
      await designate(literalWord('docs/a.md'), null, { known: ['/r', '/r/docs'], uncertain: false }, VIEW),
    ).toEqual({
      paths: ['/r/docs/a.md', '/r/docs/docs/a.md'],
      pattern: null,
    });
    expect(await designate(literalWord('/etc/x'), null, known, VIEW)).toEqual({ paths: ['/etc/x'], pattern: null });
  });

  test('expands patterns to existing files, dot files only when the pattern names them', async () => {
    const [command] = readCommands('rm docs/*.md', { home: null });
    const word = command?.words[1] ?? literalWord('');
    expect((await designate(word, null, known, VIEW)).paths).toEqual(['/r/docs/a.md']);
  });

  test('matches what an unknown or uncertain word may name instead of listing it', async () => {
    const [partly] = readCommands('rm "$ROOT/.git/hooks/x"', { home: null });
    const partlyKnown = await designate(partly?.words[1] ?? literalWord(''), null, known, VIEW);
    expect(partlyKnown.pattern?.test('/home/a/r/.git/hooks/x')).toBe(true);
    const uncertain = await designate(literalWord('hooks/x'), null, { known: ['/r'], uncertain: true }, VIEW);
    expect(uncertain.pattern?.test('/r/.git/hooks/x')).toBe(true);
    const [unknown] = readCommands('rm "$f"', { home: null });
    expect(await designate(unknown?.words[1] ?? literalWord(''), null, known, VIEW)).toEqual({
      paths: [],
      pattern: null,
    });
  });

  test('starts from the base a command sets', async () => {
    expect((await designate(literalWord('a'), literalWord('sub'), known, VIEW)).paths).toEqual(['/r/sub/a']);
  });
});
