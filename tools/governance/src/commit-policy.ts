import type { CommitPolicy } from '@huma/git-hooks/message';
import type { CommitObject, GitRepository } from '@huma/kit/git';
import { listFiles, treeDirectories } from '@huma/kit/git';
import { isOneOf } from '@huma/kit/records';
import { WORKSPACE_ROOTS } from './workspace-manifest.ts';

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

/** Scopes that name no package directory: the repository as a whole, and the spike reports. */
export const EXTRA_SCOPES = ['repo', 'spikes'] as const;

/** Trailer that cites an ADR, one per line: `Refs: ADR-0007`. */
export const REFS_TRAILER = 'Refs';

const policyWith = (packages: Iterable<string>): CommitPolicy => ({
  types: COMMIT_TYPES,
  scopes: new Set([...packages, ...EXTRA_SCOPES]),
  maxHeaderLength: 100,
  refsKey: REFS_TRAILER,
  otherTrailers: ['Co-authored-by', 'BREAKING-CHANGE'],
});

/** Names of the package directories the files of `paths` belong to under a workspace root, once each. */
export function packageDirectories(paths: Iterable<string>): ReadonlySet<string> {
  return new Set(
    [...paths].flatMap((path) => {
      const [root = '', name, ...rest] = path.split('/');
      return isOneOf(WORKSPACE_ROOTS, root) && name !== undefined && rest.length > 0 ? [name] : [];
    }),
  );
}

/** The policy of the commit being made: its scopes name the package directories the index holds. */
export async function commitPolicy(repository: GitRepository): Promise<CommitPolicy> {
  return policyWith(packageDirectories(await listFiles(repository, 'index')));
}

/**
 * The policy each past commit was made under: its scopes name the package directories of its tree and of its first
 * parent's tree, so a package renamed or removed later keeps valid the commits that named it, removal included.
 */
export function historicalCommitPolicy(repository: GitRepository): (commit: CommitObject) => Promise<CommitPolicy> {
  const packages = new Map<string, Promise<readonly string[]>>();
  const packagesAt = async (revision: string): Promise<readonly string[]> => {
    const known = packages.get(revision);
    if (known !== undefined) {
      return known;
    }
    const listed = treeDirectories(repository, revision, WORKSPACE_ROOTS).then((directories) =>
      directories.map((directory) => directory.slice(directory.indexOf('/') + 1)),
    );
    packages.set(revision, listed);
    return listed;
  };
  return async (commit) => {
    const [parent] = commit.parents;
    return policyWith([...(await packagesAt(commit.id)), ...(parent === undefined ? [] : await packagesAt(parent))]);
  };
}
