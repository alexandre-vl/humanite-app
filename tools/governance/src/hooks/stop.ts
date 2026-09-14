import { blockStop, decideStop, isStopHookActive } from '@huma/agents/stop';
import { ownRepository, worktreeTreeId } from '@huma/kit/git';
import { parseJson } from '@huma/kit/json';
import { readVerifiedTree, runVerify } from '../verify.ts';

const OUTPUT_TAIL = 4000;

/** Output of the `Stop` hook: nothing to let the agent stop, or a block decision with the failing step. */
export async function respondToStop(rawInput: string, root: string): Promise<string> {
  const currentTree = await worktreeTreeId(ownRepository(root));
  const action = decideStop({
    stopHookActive: isStopHookActive(parseJson(rawInput)),
    currentTree,
    verifiedTree: await readVerifiedTree(root),
  });
  if (action === 'allow') {
    return '';
  }
  const outcome = await runVerify(root, { staged: false, output: 'captured', env: process.env });
  if (outcome.kind === 'passed') {
    return '';
  }
  return blockStop(
    `pnpm verify échoue à l’étape ${outcome.step} : corriger avant de terminer, ou dire pourquoi c’est impossible.\n${outcome.output.slice(-OUTPUT_TAIL)}`,
  );
}
