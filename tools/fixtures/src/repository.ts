import { mkdir } from 'node:fs/promises';
import type { GitRepository } from '@huma/kit/git';
import { git, isolatedRepository } from '@huma/kit/git';
import type { FileTree } from './workspace.ts';
import { replaceTree } from './workspace.ts';

/** Fixed author, committer and dates: a fixture repository gets the same commit ids on every run. */
export const FIXTURE_IDENTITY = {
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.org',
  GIT_AUTHOR_DATE: '2026-09-14T12:00:00+02:00',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.org',
  GIT_COMMITTER_DATE: '2026-09-14T12:00:00+02:00',
} as const;

export type FixtureCommit = Readonly<{
  /** Full tree of the repository after the commit. */
  files: FileTree;
  message?: string;
}>;

export type RepositoryPlan = Readonly<{
  commits?: readonly FixtureCommit[];
  /** Full tree staged in the index after the commits. */
  staged?: FileTree;
  /** Full working tree after the commits and the staging; the last state otherwise. */
  worktree?: FileTree;
}>;

export type RepositoryOptions = Readonly<{
  /** Rewrites each tree before it is written, to add the files a tool generates for instance. */
  prepare?: (files: FileTree) => Promise<FileTree>;
  /** Hooks stay disabled unless a fixture tests them; the commits of the plan never run them. */
  hooks?: 'disabled' | 'enabled';
}>;

const identity = async (files: FileTree): Promise<FileTree> => Promise.resolve(files);

/**
 * Creates at `root` a git repository that goes through the states of `plan`. It is isolated from the calling
 * process: no git variable of a hook, no user configuration, fixed identity and dates.
 */
export async function createRepository(
  root: string,
  plan: RepositoryPlan,
  options: RepositoryOptions = {},
): Promise<GitRepository> {
  const repository = isolatedRepository(root, { ...process.env, ...FIXTURE_IDENTITY });
  const prepare = options.prepare ?? identity;
  await mkdir(root, { recursive: true });
  await git(repository, ['init', '--quiet', '--initial-branch=main']);
  if (options.hooks !== 'enabled') {
    await git(repository, ['config', 'core.hooksPath', '/dev/null']);
  }
  let previous: FileTree = {};
  for (const [index, commit] of (plan.commits ?? []).entries()) {
    const files = await prepare(commit.files);
    await replaceTree(root, previous, files);
    await git(repository, ['add', '--all']);
    await git(repository, [
      'commit',
      '--quiet',
      '--allow-empty',
      '--no-verify',
      '-m',
      commit.message ?? `état ${String(index + 1)}`,
    ]);
    previous = files;
  }
  if (plan.staged !== undefined) {
    const files = await prepare(plan.staged);
    await replaceTree(root, previous, files);
    await git(repository, ['add', '--all']);
    previous = files;
  }
  if (plan.worktree !== undefined) {
    await replaceTree(root, previous, await prepare(plan.worktree));
  }
  return repository;
}
