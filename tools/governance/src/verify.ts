import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { print } from '@huma/kit/cli';
import { readTextIfExists } from '@huma/kit/fs';
import { ownRepository, worktreeTreeId } from '@huma/kit/git';
import { isJsonObject, parseJson, stringField } from '@huma/kit/json';
import type { Environment } from '@huma/kit/process';
import { capture, describeExit, runAttached } from '@huma/kit/process';
import type { VerifyEntry, VerifyStep } from './commands.ts';
import { BIN_DIRECTORY, COMMANDS, VERIFY_PLAN } from './commands.ts';

/**
 * Where a green run records the tree it judged, which the stop hook compares the working tree with; the agent guard
 * refuses to write it.
 */
export const STAMP_PATH = 'node_modules/.cache/huma/verify.json';

export type VerifyOutcome =
  | Readonly<{ kind: 'passed'; tree: string }>
  /**
   * Every step passed, but the tree moved while they ran: one of them wrote in what it was judging. Nothing is
   * stamped, because no run has judged the tree that is there now.
   */
  | Readonly<{ kind: 'changed'; tree: string; before: string }>
  | Readonly<{ kind: 'failed'; step: VerifyStep; ending: string; output: string }>;

export type VerifyOptions = Readonly<{
  /** Checks the index being committed: `adr:check` reads the index and the acceptance proofs run. */
  staged: boolean;
  /** `attached` streams each step to the terminal; `captured` keeps the output for a hook to report. */
  output: 'attached' | 'captured';
  env: Environment;
  /** Aborting it stops the captured step in flight, which then fails: a caller with a deadline sets it. */
  signal?: AbortSignal;
}>;

/** What the step runs: the Node running this process for an entry of the repository, a linked binary otherwise. */
const stepCommand = (root: string, entry: VerifyEntry, staged: boolean): readonly [string, ...string[]] => {
  const spec = COMMANDS[entry.step];
  const args = [...spec.arguments, ...(staged ? (entry.staged ?? []) : [])];
  return spec.program.kind === 'node'
    ? [process.execPath, spec.program.entry, ...args]
    : [join(root, BIN_DIRECTORY, spec.program.name), ...args];
};

export async function readVerifiedTree(root: string): Promise<string | null> {
  const text = await readTextIfExists(join(root, STAMP_PATH));
  const stamp = text === null ? null : parseJson(text);
  return isJsonObject(stamp) ? stringField(stamp, 'tree') : null;
}

/** Runs every step of `VERIFY_PLAN` in order, stopping at the first failure; a success records the verified tree. */
export async function runVerify(root: string, options: VerifyOptions): Promise<VerifyOutcome> {
  const repository = ownRepository(root, options.env);
  const before = await worktreeTreeId(repository);
  const env = { ...options.env, PATH: `${join(root, BIN_DIRECTORY)}:${options.env['PATH'] ?? ''}` };
  const signal = options.signal === undefined ? {} : { signal: options.signal };
  for (const entry of VERIFY_PLAN) {
    const [command, ...args] = stepCommand(root, entry, options.staged);
    const child = { cwd: root, env, timeoutMs: entry.budgetMs, ...signal };
    if (options.output === 'attached') {
      print(`▶ ${entry.step}`);
      const exit = await runAttached(command, args, child);
      if (exit.kind !== 'exited' || exit.code !== 0) {
        return { kind: 'failed', step: entry.step, ending: describeExit(exit), output: '' };
      }
      continue;
    }
    const result = await capture(command, args, child);
    if (result.exit.kind !== 'exited' || result.exit.code !== 0) {
      return {
        kind: 'failed',
        step: entry.step,
        ending: describeExit(result.exit),
        output: `${result.stdout.toString('utf8')}${result.stderr.toString('utf8')}`,
      };
    }
  }
  const tree = await worktreeTreeId(repository);
  if (tree !== before) {
    return { kind: 'changed', tree, before };
  }
  await mkdir(dirname(join(root, STAMP_PATH)), { recursive: true });
  await writeFile(join(root, STAMP_PATH), `${JSON.stringify({ tree, at: new Date().toISOString() })}\n`);
  return { kind: 'passed', tree };
}
