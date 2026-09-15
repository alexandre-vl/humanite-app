import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { isAccessible, readTextIfExists } from '@huma/kit/fs';
import type { GitRepository } from '@huma/kit/git';
import { gitPaths, writeTree } from '@huma/kit/git';
import { repoPath } from '@huma/kit/paths';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';

/**
 * `git commit --no-verify` skips pre-commit and commit-msg but still runs prepare-commit-msg. Pre-commit records the
 * tree it verified under the id of the git process that runs both hooks; prepare-commit-msg refuses a commit whose
 * git process recorded nothing, or whose index changed since. The marker lives in the git directory, which the agent
 * guard refuses to write, and one marker answers for one commit: it is removed as soon as it is read.
 */

/** Where pre-commit records the verified trees, under the git directory of the worktree. */
const MARKER_DIRECTORY_NAME = 'huma-verified-trees';

/** Markers older than this come from commits long finished: pre-commit removes them. */
const MARKER_LIFETIME_MS = 60 * 60 * 1000;

/** States in which git writes commits without pre-commit on its own: they are not bypasses. */
const EXEMPT_STATES = ['CHERRY_PICK_HEAD', 'rebase-merge', 'rebase-apply'];

/** Where findings about the marker point: the git directory holds it, and no repository path names that. */
const GIT_DIRECTORY = repoPath('.git');

async function markerDirectory(repository: GitRepository): Promise<string> {
  const [directory] = await gitPaths(repository, [MARKER_DIRECTORY_NAME]);
  if (directory === undefined) {
    throw new Error(`git rev-parse --git-path ${MARKER_DIRECTORY_NAME} : aucun chemin`);
  }
  return directory;
}

/** Records `tree` as verified for the git process `gitProcess`, and forgets the markers of old commits. */
export async function recordVerifiedTree(repository: GitRepository, gitProcess: number, tree: string): Promise<void> {
  const directory = await markerDirectory(repository);
  await mkdir(directory, { recursive: true });
  const now = Date.now();
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const { mtimeMs } = await stat(path);
    if (now - mtimeMs > MARKER_LIFETIME_MS) {
      await rm(path, { force: true });
    }
  }
  await writeFile(join(directory, String(gitProcess)), `${tree}\n`, 'utf8');
}

/** Refuses a commit that pre-commit did not verify, unless git is cherry-picking or rebasing. */
export async function checkVerifiedTree(
  repository: GitRepository,
  gitProcess: number,
): Promise<readonly Diagnostic<GitHookCode>[]> {
  const states = await gitPaths(repository, EXEMPT_STATES);
  for (const state of states) {
    if (await isAccessible(state)) {
      return [];
    }
  }
  const marker = join(await markerDirectory(repository), String(gitProcess));
  const recorded = (await readTextIfExists(marker))?.trim();
  const tree = await writeTree(repository);
  await rm(marker, { force: true });
  return recorded === tree ? [] : [gitHookFinding('git/verify-skipped', GIT_DIRECTORY, {})];
}
