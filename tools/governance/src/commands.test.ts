import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { compileGlob } from '@huma/adr/globs';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { compareText } from '@huma/kit/text';
import { expect, test } from 'vitest';
import type { VerifyEntry } from './commands.ts';
import { COMMAND_NAMES, COMMANDS, HOOK_ENTRIES, isScriptCommand, VERIFY_PLAN } from './commands.ts';
import { stepIsBlind } from './verify.ts';

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

/**
 * A step is skipped only when every path of the commit is something it declared itself blind to.
 *
 * The cases below are the four ways the question can be answered, and three of them answer « run it ». That is the
 * point of stating what a step ignores rather than what it reads: everything nobody thought about runs everything.
 */
test('a step is skipped only when the whole commit is outside what it can read', () => {
  const blind: VerifyEntry = { step: 'test', budgetMs: 1, blindTo: ['docs/**/*.md'] };
  const always: VerifyEntry = { step: 'adr:check', budgetMs: 1 };
  expect(stepIsBlind(blind, ['docs/adr/0001-x.md', 'docs/adr/README.md'])).toBe(true);
  // One path outside the globs, and the step runs over all of them.
  expect(stepIsBlind(blind, ['docs/adr/0001-x.md', 'packages/design-tokens/src/tokens.ts'])).toBe(false);
  // Markdown is what was checked, not the folder: the glossary lives under docs and the lint configuration reads it.
  expect(stepIsBlind(blind, ['docs/glossary.ts'])).toBe(false);
  // A caller that does not say what changed, and a commit of nothing, both run the whole plan.
  expect(stepIsBlind(blind, undefined)).toBe(false);
  expect(stepIsBlind(blind, [])).toBe(false);
  // A step that declares nothing is never skipped, whatever the commit holds.
  expect(stepIsBlind(always, ['docs/adr/0001-x.md'])).toBe(false);
});

/** The four steps that read the documents themselves, or every file, must never declare themselves blind to prose. */
test('the steps a document commit still has to pass declare no blindness', () => {
  const sighted = PLAN.filter((entry) => entry.blindTo === undefined).map((entry) => entry.step);
  expect(sighted.toSorted(compareText)).toEqual(['adr:check', 'format:check', 'gen:check', 'hooks:check']);
});

/** Every glob of the plan is inside the subset the repository reads scopes with; one outside would match nothing. */
test('every glob a step is blind to compiles', () => {
  const globs = PLAN.flatMap((entry) => entry.blindTo ?? []);
  expect(globs.length).toBeGreaterThan(0);
  expect(globs.filter((glob) => compileGlob(glob) === null)).toEqual([]);
});
