import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { print } from '@huma/kit/cli';
import { readTextIfExists } from '@huma/kit/fs';
import { ownRepository, worktreeTreeId } from '@huma/kit/git';
import { isJsonObject, parseJson, stringField } from '@huma/kit/json';
import type { Environment } from '@huma/kit/process';
import { capture, describeExit, runAttached } from '@huma/kit/process';
import type { CommandName } from './commands.ts';
import { BIN_DIRECTORY, COMMANDS, STAGED_ARGUMENTS, VERIFY_BUDGETS_MS, VERIFY_STEPS } from './commands.ts';

/** Records the tree the last successful `pnpm verify` saw; the stop hook compares the working tree with it. */
/** Where a green run records the tree it judged; the agent guard refuses to write it. */
export const STAMP_PATH = 'node_modules/.cache/huma/verify.json';

export type VerifyOutcome =
  | Readonly<{ kind: 'passed'; tree: string }>
  | Readonly<{ kind: 'failed'; step: CommandName; ending: string; output: string }>;

export type VerifyOptions = Readonly<{
  /** Checks the index being committed: `adr:check` reads the index and the acceptance proofs run. */
  staged: boolean;
  /** `attached` streams each step to the terminal; `captured` keeps the output for a hook to report. */
  output: 'attached' | 'captured';
  env: Environment;
  /** Aborting it stops the captured step in flight, which then fails: a caller with a deadline sets it. */
  signal?: AbortSignal;
}>;

const stepArguments = (step: CommandName, staged: boolean): readonly string[] => {
  const [, ...args] = COMMANDS[step].argv;
  return staged ? [...args, ...(STAGED_ARGUMENTS[step] ?? [])] : args;
};

const program = (root: string, name: string): string =>
  name === 'node' ? process.execPath : join(root, BIN_DIRECTORY, name);

export async function readVerifiedTree(root: string): Promise<string | null> {
  const text = await readTextIfExists(join(root, STAMP_PATH));
  const stamp = text === null ? null : parseJson(text);
  return isJsonObject(stamp) ? stringField(stamp, 'tree') : null;
}

/** Runs every step of `VERIFY_STEPS` in order, stopping at the first failure; a success records the verified tree. */
export async function runVerify(root: string, options: VerifyOptions): Promise<VerifyOutcome> {
  const repository = ownRepository(root, options.env);
  const treeBefore = await worktreeTreeId(repository);
  const env = { ...options.env, PATH: `${join(root, BIN_DIRECTORY)}:${options.env['PATH'] ?? ''}` };
  for (const step of VERIFY_STEPS) {
    const [name] = COMMANDS[step].argv;
    const args = stepArguments(step, options.staged);
    if (options.output === 'attached') {
      print(`▶ ${step}`);
      const exit = await runAttached(program(root, name), args, { cwd: root, env, timeoutMs: VERIFY_BUDGETS_MS[step] });
      if (exit.kind !== 'exited' || exit.code !== 0) {
        return { kind: 'failed', step, ending: describeExit(exit), output: '' };
      }
      continue;
    }
    const result = await capture(program(root, name), args, {
      cwd: root,
      env,
      timeoutMs: VERIFY_BUDGETS_MS[step],
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
    if (result.exit.kind !== 'exited' || result.exit.code !== 0) {
      return {
        kind: 'failed',
        step,
        ending: describeExit(result.exit),
        output: `${result.stdout.toString('utf8')}${result.stderr.toString('utf8')}`,
      };
    }
  }
  const treeAfter = await worktreeTreeId(repository);
  if (treeAfter === treeBefore) {
    await mkdir(dirname(join(root, STAMP_PATH)), { recursive: true });
    await writeFile(join(root, STAMP_PATH), `${JSON.stringify({ tree: treeAfter, at: new Date().toISOString() })}\n`);
  }
  return { kind: 'passed', tree: treeAfter };
}
