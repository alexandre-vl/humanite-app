import type { CommitPolicy } from '@huma/git-hooks/message';
import type { GitRepository } from '@huma/kit/git';
import { listFiles } from '@huma/kit/git';
import { isOneOf } from '@huma/kit/records';

/** Commit types of Conventional Commits the repository uses. */
export const COMMIT_TYPES = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'test',
  'build',
  'chore',
  'revert',
  'style',
] as const;

/** Directories whose subdirectories are the packages of the workspace; each package name is a commit scope. */
export const WORKSPACE_ROOTS = ['apps', 'infra', 'packages', 'tools'] as const;

/** Scopes that name no package. */
export const EXTRA_SCOPES = ['deps', 'repo', 'spikes'] as const;

/** The branch whose commits stay: `fixup!` and `squash!` messages are refused there. */
export const DEFAULT_BRANCH = 'main';

/** Trailer that cites an ADR, one per line: `Refs: ADR-0007`. */
export const REFS_TRAILER = 'Refs';

/** The policy of the repository, with the scopes of the packages the index holds. */
export async function commitPolicy(repository: GitRepository): Promise<CommitPolicy> {
  const packages = [...(await listFiles(repository, 'index'))].flatMap((path) => {
    const [root = '', name, ...rest] = path.split('/');
    return isOneOf(WORKSPACE_ROOTS, root) && name !== undefined && rest.length > 0 ? [name] : [];
  });
  return {
    types: COMMIT_TYPES,
    scopes: new Set([...packages, ...EXTRA_SCOPES]),
    maxHeaderLength: 100,
    refsKey: REFS_TRAILER,
    otherTrailers: ['Co-authored-by', 'BREAKING-CHANGE'],
  };
}
