import type { Diagnostic } from '@huma/kit/diagnostics';
import type { GitRepository } from '@huma/kit/git';
import { commitTrailers, currentBranch, firstParentHistory, isAncestor, isShallow, resolveCommit } from '@huma/kit/git';
import { repoPath } from '@huma/kit/paths';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';
import type { CommitPolicy } from './message.ts';
import { checkMessage } from './message.ts';

export type HistoryContext = Readonly<{
  repository: GitRepository;
  /** Last commit before the hooks applied: the commits after it, along the first-parent chain, are checked. */
  anchor: string;
  /** The branch whose commits stay: `fixup!` messages are refused on it. */
  defaultBranch: string;
  policy: CommitPolicy;
}>;

/** Where history findings point; each also names its commit. */
const HISTORY_PATH = repoPath('.git');

/**
 * Every commit the branch gained since the anchor has a message the commit-msg hook accepts: a commit that went
 * around the hooks, by `core.hooksPath` or plumbing, still shows here. Replace refs and grafts are ignored.
 */
export async function checkCommitHistory(context: HistoryContext): Promise<readonly Diagnostic<GitHookCode>[]> {
  const { repository, anchor } = context;
  if (await isShallow(repository)) {
    return [gitHookFinding('git/history-shallow', HISTORY_PATH, {})];
  }
  const commit = await resolveCommit(repository, anchor);
  if (commit === null) {
    return [gitHookFinding('git/anchor-unknown', HISTORY_PATH, { anchor })];
  }
  if (!(await isAncestor(repository, commit, 'HEAD'))) {
    return [gitHookFinding('git/anchor-not-ancestor', HISTORY_PATH, { anchor })];
  }
  const commits = await firstParentHistory(repository, { since: commit });
  const trailers = await commitTrailers(
    repository,
    commits.map((each) => each.id),
  );
  const onDefaultBranch = (await currentBranch(repository)) === context.defaultBranch;
  return commits.flatMap((each) =>
    checkMessage(
      {
        message: each.message ?? '',
        trailers: trailers.get(each.id) ?? [],
        editor: false,
        onDefaultBranch,
        path: HISTORY_PATH,
        commit: each.id,
      },
      context.policy,
    ),
  );
}
