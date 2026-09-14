import { access, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { readTextIfExists } from '@huma/kit/fs';
import type { GitRepository } from '@huma/kit/git';
import { gitPaths, writeTree } from '@huma/kit/git';
import { repoPath } from '@huma/kit/paths';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';

/**
 * `git commit --no-verify` skips pre-commit and commit-msg but still runs prepare-commit-msg. Pre-commit records the
 * tree it verified under the id of the git process that runs both hooks; prepare-commit-msg refuses a commit whose
 * git process recorded nothing, or whose index changed since.
 */

/** Where pre-commit records the verified trees, in the worktree: git runs hooks at its root. */
export const MARKER_DIRECTORY = 'node_modules/.cache/huma/git-hooks';

/** Markers older than this come from commits long finished: pre-commit removes them. */
const MARKER_LIFETIME_MS = 60 * 60 * 1000;

/** States in which git writes commits without pre-commit on its own: they are not bypasses. */
const EXEMPT_STATES = ['CHERRY_PICK_HEAD', 'rebase-merge', 'rebase-apply'];

const markerPath = (root: string, gitProcess: number): string => join(root, MARKER_DIRECTORY, String(gitProcess));

/** Records `tree` as verified for the git process `gitProcess`, and forgets the markers of old commits. */
export async function recordVerifiedTree(root: string, gitProcess: number, tree: string): Promise<void> {
  const directory = join(root, MARKER_DIRECTORY);
  await mkdir(directory, { recursive: true });
  const now = Date.now();
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const { mtimeMs } = await stat(path);
    if (now - mtimeMs > MARKER_LIFETIME_MS) {
      await rm(path, { force: true });
    }
  }
  await writeFile(markerPath(root, gitProcess), `${tree}\n`, 'utf8');
}

const exists = async (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

/** Refuses a commit that pre-commit did not verify, unless git is cherry-picking or rebasing. */
export async function checkVerifiedTree(
  repository: GitRepository,
  gitProcess: number,
): Promise<readonly Diagnostic<GitHookCode>[]> {
  const states = await gitPaths(repository, EXEMPT_STATES);
  for (const state of states) {
    if (await exists(state)) {
      return [];
    }
  }
  const recorded = (await readTextIfExists(markerPath(repository.root, gitProcess)))?.trim();
  return recorded === (await writeTree(repository))
    ? []
    : [gitHookFinding('git/verify-skipped', repoPath(MARKER_DIRECTORY), {})];
}
