/**
 * Entry of the git hook shims: git runs it at the root of the worktree, with the hook name and the arguments git gives
 * that hook. Any finding, or a crash, makes the hook exit non-zero and git refuses the command.
 */
import type { Verification } from '@huma/git-hooks/flows';
import { applyPatchMessage, commitMessage, preCommit, prepareCommitMessage } from '@huma/git-hooks/flows';
import { GIT_HOOK_NAMES, isGitHookName } from '@huma/git-hooks/shims';
import { findWorkspaceRoot, printError, readArguments, runCommand, UsageError } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { ownRepository } from '@huma/kit/git';
import { commitPolicy } from '../commit-policy.ts';
import { expectedRefs } from '../commit-refs.ts';
import { runVerify } from '../verify.ts';

const USAGE = `Usage : lancé par les hooks git, git-hook.ts ${GIT_HOOK_NAMES.join('|')} [arguments de git]`;

await runCommand(async () => {
  const { positionals } = readArguments(USAGE, { allowPositionals: true, options: {} });
  const [hook = '', messageFile] = positionals;
  if (!isGitHookName(hook)) {
    throw new UsageError(USAGE);
  }
  const root = await findWorkspaceRoot();
  const repository = ownRepository(root);
  const verify = async (): Promise<Verification> => {
    const outcome = await runVerify(root, { staged: true, output: 'attached', env: process.env });
    // A run that wrote in the tree it judged is not a failure of a step: pre-commit writes the tree again after the
    // checks and refuses the commit itself, with the code that says the tree moved.
    return outcome.kind === 'failed'
      ? { kind: 'failed', step: outcome.step, ending: outcome.ending }
      : { kind: 'passed' };
  };
  const context = { repository, gitProcess: process.ppid, verify };
  const findings = await (async () => {
    switch (hook) {
      case 'pre-commit':
      case 'pre-merge-commit':
        return preCommit(context);
      case 'prepare-commit-msg':
        return prepareCommitMessage(context);
      case 'commit-msg':
        if (messageFile === undefined) {
          throw new UsageError(USAGE);
        }
        return commitMessage({
          repository,
          messageFile,
          editor: process.env['GIT_EDITOR'] !== ':',
          policy: await commitPolicy(repository),
          expectedRefs: async (base) => expectedRefs(repository, base),
        });
      case 'applypatch-msg':
        return applyPatchMessage();
    }
  })();
  if (findings.length > 0) {
    printError(renderDiagnostics(findings, 'text'));
    printError(`✗ hook git ${hook} : commit refusé`);
    return 1;
  }
  return 0;
});
