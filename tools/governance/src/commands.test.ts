import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { compareText } from '@huma/kit/text';
import { expect, test } from 'vitest';
import type { VerifyEntry } from './commands.ts';
import { COMMAND_NAMES, COMMANDS, HOOK_ENTRIES, isScriptCommand, VERIFY_PLAN } from './commands.ts';

/** The plan as its own type: a step that declares no index arguments simply has none, it is not a different step. */
const PLAN: readonly VerifyEntry[] = VERIFY_PLAN;

const workspace = async (): Promise<string> => findWorkspaceRoot(import.meta.dirname);

/** What the command runs, as a path of the repository. */
const programPath = (name: (typeof COMMAND_NAMES)[number]): string => {
  const { program } = COMMANDS[name];
  return program.kind === 'node' ? program.entry : `node_modules/.bin/${program.name}`;
};

const missing = async (root: string, paths: readonly string[]): Promise<readonly string[]> => {
  const absent: string[] = [];
  for (const path of paths) {
    const there = await stat(join(root, path)).then(
      () => true,
      () => false,
    );
    if (!there) {
      absent.push(path);
    }
  }
  return absent;
};

test('every command names a file of the repository, or a program pnpm links', async () => {
  const root = await workspace();
  expect(await missing(root, COMMAND_NAMES.map(programPath))).toEqual([]);
});

test('every step of pnpm verify is a command anyone can run alone, with a budget', () => {
  for (const entry of VERIFY_PLAN) {
    expect(COMMANDS[entry.step].audience, entry.step).toBe('everyone');
    expect(entry.budgetMs, entry.step).toBeGreaterThan(0);
  }
});

test('no step runs twice: the plan gives an order, not a set', () => {
  const steps = VERIFY_PLAN.map((entry) => entry.step);
  expect(steps).toEqual([...new Set(steps)]);
});

// `readArguments` turns an option declared as `staged` into `--staged`; a step whose entry stopped declaring one would
// otherwise take a flag it no longer parses, and only from pre-commit, where nobody reads the output.
test('a step that takes arguments on an index names options its own entry declares', async () => {
  const root = await workspace();
  for (const entry of PLAN) {
    const { program } = COMMANDS[entry.step];
    if (entry.staged === undefined || program.kind !== 'node') {
      continue;
    }
    const source = await readFile(join(root, program.entry), 'utf8');
    for (const option of entry.staged.filter((word) => word.startsWith('--'))) {
      expect(source, `${entry.step} ${option}`).toMatch(new RegExp(`\\b${option.slice(2)}\\s*:`, 'u'));
    }
  }
});

test('the names are sorted, so nothing derived from them reorders on its own', () => {
  expect(COMMAND_NAMES).toEqual([...COMMAND_NAMES].toSorted(compareText));
});

test('the entries knip is given are exactly the commands no package script reaches', () => {
  const unreachable = COMMAND_NAMES.filter((name) => !isScriptCommand(COMMANDS[name]));
  expect(unreachable).not.toHaveLength(0);
  expect(HOOK_ENTRIES).toEqual(unreachable.map(programPath));
});
