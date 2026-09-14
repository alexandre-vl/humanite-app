import { blockOutput, readHookInput } from '@huma/agents/protocol';
import { decideStop } from '@huma/agents/stop';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { ownRepository, worktreeTreeId } from '@huma/kit/git';
import { STOP_TIMEOUT_SECONDS } from '../policy.ts';
import { readVerifiedTree, runVerify } from '../verify.ts';

const OUTPUT_TAIL = 4_000;

/** Time kept after the checks for the answer to reach Claude Code before it kills the hook. */
const ANSWER_MARGIN_MS = 30_000;

/**
 * Output of the `Stop` hook: nothing to let the agent stop, or a block decision with the failing step. The checks run
 * in the workspace of the session, which Claude Code reports as `cwd`, and stop before the hook's own timeout.
 */
export async function respondToStop(rawInput: string): Promise<string> {
  const input = readHookInput(rawInput);
  const root = await findWorkspaceRoot(input?.cwd ?? process.cwd());
  const action = decideStop({
    stopHookActive: input?.stopHookActive ?? false,
    currentTree: await worktreeTreeId(ownRepository(root)),
    verifiedTree: await readVerifiedTree(root),
  });
  if (action === 'allow') {
    return '';
  }
  const outcome = await runVerify(root, {
    staged: false,
    output: 'captured',
    env: process.env,
    signal: AbortSignal.timeout(STOP_TIMEOUT_SECONDS * 1_000 - ANSWER_MARGIN_MS),
  });
  if (outcome.kind === 'passed') {
    return '';
  }
  return blockOutput(
    `pnpm verify échoue à l’étape ${outcome.step} (${outcome.ending}) : corriger avant de terminer, ou dire pourquoi c’est impossible.\n${outcome.output.slice(-OUTPUT_TAIL)}`,
  );
}
