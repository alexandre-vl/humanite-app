import { readFile } from 'node:fs/promises';
import type { Diagnostic } from '@huma/kit/diagnostics';
import type { GitRepository } from '@huma/kit/git';
import { messageTrailers, writeTree } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';
import type { CommitPolicy, ExpectedRefs } from './message.ts';
import { checkMessage, checkRefs } from './message.ts';
import { checkStaging } from './staging.ts';
import { checkVerifiedTree, recordVerifiedTree } from './tripwire.ts';

/** The outcome of the repository checks a pre-commit runs on the index. */
export type Verification = Readonly<{ kind: 'passed' }> | Readonly<{ kind: 'failed'; step: string; ending: string }>;

export type PreCommitContext = Readonly<{
  repository: GitRepository;
  /** Id of the git process that runs the hooks of this commit. */
  gitProcess: number;
  /** Runs the checks of the repository on what the index holds. */
  verify: () => Promise<Verification>;
}>;

const INDEX_PATH = repoPath('.git/index');

/**
 * pre-commit and pre-merge-commit: the index holds the whole working tree, the checks pass on it, nothing changed
 * while they ran, and the verified tree is recorded for prepare-commit-msg.
 */
export async function preCommit(context: PreCommitContext): Promise<readonly Diagnostic<GitHookCode>[]> {
  const { repository } = context;
  const staging = await checkStaging(repository);
  if (staging.length > 0) {
    return staging;
  }
  const tree = await writeTree(repository);
  const verification = await context.verify();
  if (verification.kind === 'failed') {
    return [gitHookFinding('git/verify-failed', INDEX_PATH, { step: verification.step, ending: verification.ending })];
  }
  if ((await checkStaging(repository)).length > 0 || (await writeTree(repository)) !== tree) {
    return [gitHookFinding('git/tree-changed', INDEX_PATH, {})];
  }
  await recordVerifiedTree(repository, context.gitProcess, tree);
  return [];
}

/** prepare-commit-msg: the commit went through pre-commit. */
export const prepareCommitMessage = async (context: PreCommitContext): Promise<readonly Diagnostic<GitHookCode>[]> =>
  checkVerifiedTree(context.repository, context.gitProcess);

export type CommitMessageContext = Readonly<{
  repository: GitRepository;
  /** The file git passes to commit-msg. */
  messageFile: string;
  /** `GIT_EDITOR` is not `:`: an editor wrote the message and git strips its comments. */
  editor: boolean;
  policy: CommitPolicy;
  /** The ADRs a commit of the index on top of `base` must and may cite. */
  expectedRefs: (base: 'HEAD' | 'HEAD^') => Promise<ExpectedRefs>;
}>;

const MESSAGE_PATH: RepoPath = repoPath('.git/COMMIT_EDITMSG');

/**
 * commit-msg: the message follows the policy and cites exactly the ADRs the commit touches. An amend cannot be told
 * from a plain commit here, so the citations computed on top of `HEAD^` are accepted too.
 */
export async function commitMessage(context: CommitMessageContext): Promise<readonly Diagnostic<GitHookCode>[]> {
  const { repository } = context;
  const message = await readFile(context.messageFile, 'utf8');
  const input = {
    message,
    trailers: await messageTrailers(repository, message),
    editor: context.editor,
    path: MESSAGE_PATH,
    commit: null,
  };
  const refs = checkRefs(input, await context.expectedRefs('HEAD'), context.policy);
  const amended = refs.length === 0 ? [] : checkRefs(input, await context.expectedRefs('HEAD^'), context.policy);
  return [...checkMessage(input, context.policy), ...(amended.length === 0 ? [] : refs)];
}

/** applypatch-msg: `git am` writes commits without pre-commit. */
export const applyPatchMessage = (): readonly Diagnostic<GitHookCode>[] => [
  gitHookFinding('git/patch-refused', MESSAGE_PATH, {}),
];
