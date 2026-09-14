import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { print } from '@huma/kit/cli';
import { ownRepository, worktreeTreeId } from '@huma/kit/git';
import { isJsonObject, parseJson, stringField } from '@huma/kit/json';
import type { Environment } from '@huma/kit/process';
import { run, runAttached } from '@huma/kit/process';
import type { CommandName } from './commands.ts';
import { COMMANDS, VERIFY_STEPS } from './commands.ts';

/** Records the tree the last successful `pnpm verify` saw; the stop hook compares the working tree with it. */
export const STAMP_PATH = 'node_modules/.cache/huma/verify.json';

const BIN = 'node_modules/.bin';

const EVERY_EXIT_CODE = Array.from({ length: 256 }, (value, code) => code);

export type VerifyOutcome =
  Readonly<{ kind: 'passed'; tree: string }> | Readonly<{ kind: 'failed'; step: CommandName; output: string }>;

export type VerifyOptions = Readonly<{
  /** Checks the index being committed: `adr:check` reads the index and the acceptance proofs run. */
  staged: boolean;
  /** `attached` streams each step to the terminal; `captured` keeps the output for a hook to report. */
  output: 'attached' | 'captured';
  env: Environment;
}>;

const stepArguments = (step: CommandName, staged: boolean): readonly string[] => {
  const [, ...args] = COMMANDS[step].argv;
  return step === 'adr:check' && staged ? [...args, '--source', 'index'] : args;
};

const program = (root: string, name: string): string => (name === 'node' ? process.execPath : join(root, BIN, name));

export async function readVerifiedTree(root: string): Promise<string | null> {
  try {
    const stamp = parseJson(await readFile(join(root, STAMP_PATH), 'utf8'));
    return isJsonObject(stamp) ? stringField(stamp, 'tree') : null;
  } catch {
    return null;
  }
}

/** Runs every step of `VERIFY_STEPS` in order, stopping at the first failure; a success records the verified tree. */
export async function runVerify(root: string, options: VerifyOptions): Promise<VerifyOutcome> {
  const repository = ownRepository(root, options.env);
  const treeBefore = await worktreeTreeId(repository);
  const env = { ...options.env, PATH: `${join(root, BIN)}:${options.env['PATH'] ?? ''}` };
  for (const step of VERIFY_STEPS) {
    const [name] = COMMANDS[step].argv;
    const args = stepArguments(step, options.staged);
    if (options.output === 'attached') {
      print(`▶ ${step}`);
      const code = await runAttached(program(root, name), args, { cwd: root, env });
      if (code !== 0) {
        return { kind: 'failed', step, output: '' };
      }
      continue;
    }
    const result = await run(program(root, name), args, { cwd: root, env, successCodes: EVERY_EXIT_CODE });
    if (result.exitCode !== 0) {
      return { kind: 'failed', step, output: `${result.stdout.toString('utf8')}${result.stderr.toString('utf8')}` };
    }
  }
  const treeAfter = await worktreeTreeId(repository);
  if (treeAfter === treeBefore) {
    await mkdir(dirname(join(root, STAMP_PATH)), { recursive: true });
    await writeFile(join(root, STAMP_PATH), `${JSON.stringify({ tree: treeAfter, at: new Date().toISOString() })}\n`);
  }
  return { kind: 'passed', tree: treeAfter };
}
