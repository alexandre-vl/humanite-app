import type { Diagnostic } from '@huma/kit/diagnostics';
import type { GitRepository } from '@huma/kit/git';
import { flaggedIndexEntries, statusEntries } from '@huma/kit/git';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';

/**
 * The index about to be committed holds the whole working tree: no unstaged change, no untracked file, no conflict,
 * and no entry hidden from `git status` by an assume-unchanged or skip-worktree flag. The checks then see exactly
 * what the commit records.
 */
export async function checkStaging(repository: GitRepository): Promise<readonly Diagnostic<GitHookCode>[]> {
  const flagged = (await flaggedIndexEntries(repository)).map(({ tag, path }) =>
    gitHookFinding('git/index-flagged', path, { tag }),
  );
  const status = (await statusEntries(repository)).flatMap((entry): readonly Diagnostic<GitHookCode>[] => {
    switch (entry.kind) {
      case 'tracked':
        return entry.unstaged === '.' ? [] : [gitHookFinding('git/unstaged', entry.path, {})];
      case 'unmerged':
        return [gitHookFinding('git/unmerged', entry.path, {})];
      case 'untracked':
        return [gitHookFinding('git/untracked', entry.path, {})];
    }
  });
  return [...flagged, ...status];
}
