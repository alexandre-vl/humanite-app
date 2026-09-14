import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { FileTree } from '@huma/fixtures';
import { createTemporaryDirectory, writeTree } from '@huma/fixtures';
import { runChecks } from '../check.ts';
import { effectiveStatuses, readCollection } from '../collection.ts';
import type { CheckCode } from '../diagnostics.ts';
import type { Bindings } from '../model.ts';
import { repoPath } from '../model.ts';
import { renderIndex } from '../readme.ts';
import type { Snapshot, SnapshotEntry, Source } from '../snapshot.ts';
import { ADR_DIRECTORY, INDEX_FILE } from '../spec.ts';

const execFileAsync = promisify(execFile);

/** Proof ids understood by fixture repositories: one that always passes, one that always fails. */
export const FAKE_PROOFS = { passing: 'fake/passing', failing: 'fake/failing' } as const;

export type FixtureRepository = Readonly<{
  /** Successive commits, each one the full tree of the repository; `docs/adr/README.md` is generated unless given. */
  commits?: readonly FileTree[];
  /** Tree staged in the index after the commits, for `source: 'index'`. */
  staged?: FileTree;
  /** Working tree after the commits (and the staging); defaults to the last commit or the staged tree. */
  worktree?: FileTree;
  bindings?: Bindings;
  source?: Source;
  /** Check a `git clone --depth 1` of the repository instead of the repository itself. */
  shallow?: boolean;
}>;

const GIT_ENVIRONMENT = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.org',
  GIT_AUTHOR_DATE: '2026-09-14T12:00:00+02:00',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.org',
  GIT_COMMITTER_DATE: '2026-09-14T12:00:00+02:00',
};

/** Runs git in a fixture repository, isolated from the user's configuration and hooks. */
export async function gitIn(root: string, args: readonly string[]): Promise<void> {
  await execFileAsync('git', ['-C', root, ...args], { env: GIT_ENVIRONMENT });
}

function snapshotOf(tree: FileTree): Snapshot {
  const encoder = new TextEncoder();
  const entries = Object.entries(tree).flatMap(([path, content]): SnapshotEntry[] => {
    const name = path.slice(ADR_DIRECTORY.length + 1);
    return path.startsWith(`${ADR_DIRECTORY}/`) && !name.includes('/')
      ? [{ name, kind: 'file', bytes: encoder.encode(content) }]
      : [];
  });
  return { source: 'worktree', entries, files: new Set(Object.keys(tree)) };
}

/** The tree with `docs/adr/README.md` generated from its ADRs, unless the tree already sets the index. */
async function withIndex(root: string, tree: FileTree, bindings: Bindings): Promise<FileTree> {
  if (Object.hasOwn(tree, INDEX_FILE)) {
    return tree;
  }
  const collection = readCollection(snapshotOf(tree));
  if (!collection.complete) {
    return tree;
  }
  const index = await renderIndex(root, collection.documents, effectiveStatuses(collection.documents), bindings);
  return { ...tree, [INDEX_FILE]: index };
}

/** Makes the working tree equal to `tree`: files written by an earlier state and absent from `tree` are removed. */
async function replaceTree(root: string, previous: FileTree, tree: FileTree): Promise<void> {
  for (const path of Object.keys(previous).filter((known) => !Object.hasOwn(tree, known))) {
    await rm(join(root, path), { force: true });
  }
  await writeTree(root, tree);
}

export async function materialize(root: string, repository: FixtureRepository): Promise<void> {
  const bindings = repository.bindings ?? {};
  await mkdir(root, { recursive: true });
  await gitIn(root, ['init', '--quiet', '--initial-branch=main']);
  let previous: FileTree = {};
  for (const [index, commit] of (repository.commits ?? []).entries()) {
    const tree = await withIndex(root, commit, bindings);
    await replaceTree(root, previous, tree);
    await gitIn(root, ['add', '--all']);
    await gitIn(root, ['commit', '--quiet', '--allow-empty', '--no-verify', '-m', `état ${String(index + 1)}`]);
    previous = tree;
  }
  if (repository.staged !== undefined) {
    const tree = await withIndex(root, repository.staged, bindings);
    await replaceTree(root, previous, tree);
    await gitIn(root, ['add', '--all']);
    previous = tree;
  }
  if (repository.worktree !== undefined) {
    await replaceTree(root, previous, await withIndex(root, repository.worktree, bindings));
  }
}

/** Codes reported by `adr:check` on a freshly built fixture repository. */
export async function checkFixture(repository: FixtureRepository): Promise<readonly CheckCode[]> {
  await using directory = await createTemporaryDirectory('adr-fixture');
  const origin = join(directory.path, 'origin');
  await materialize(origin, repository);
  let root = origin;
  if (repository.shallow === true) {
    root = join(directory.path, 'shallow');
    await execFileAsync('git', ['clone', '--quiet', '--depth', '1', `file://${origin}`, root], {
      env: GIT_ENVIRONMENT,
    });
  }
  const report = await runChecks({
    root,
    source: repository.source ?? 'worktree',
    bindings: {
      bindings: repository.bindings ?? {},
      path: repoPath('tools/adr/src/bindings.ts'),
      text: null,
      knownProofs: new Set(Object.values(FAKE_PROOFS)),
    },
    runProof: async (proof) => {
      await Promise.resolve();
      return proof === FAKE_PROOFS.passing;
    },
  });
  return report.diagnostics.map((diagnostic) => diagnostic.code);
}
