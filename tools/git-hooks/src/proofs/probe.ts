/**
 * Entry of the shims that end-to-end fixtures install in their repositories: pre-commit records the verified tree and
 * prepare-commit-msg checks it, through the real hook order of git, with nothing else of the workspace.
 */
import { isolatedRepository } from '@huma/kit/git';
import { prepareCommitMessage, preCommit } from '../flows.ts';

const [hook = ''] = process.argv.slice(2);
const context = {
  repository: isolatedRepository(process.cwd(), { hooks: 'enabled' }),
  gitProcess: process.ppid,
  verify: async () => Promise.resolve({ kind: 'passed' } as const),
};
const findings =
  hook === 'pre-commit'
    ? await preCommit(context)
    : hook === 'prepare-commit-msg'
      ? await prepareCommitMessage(context)
      : [];
for (const finding of findings) {
  process.stderr.write(`${finding.code}: ${finding.message}\n`);
}
process.exitCode = findings.length === 0 ? 0 : 1;
