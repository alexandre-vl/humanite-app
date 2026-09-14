import { join } from 'node:path';
import type { FileContent, FileTree } from '@huma/fixtures';
import { createRepository, createTemporaryDirectory, FIXTURE_IDENTITY } from '@huma/fixtures';
import { git, isolatedRepository } from '@huma/kit/git';
import { runChecks } from '../check.ts';
import { effectiveStatuses, readCollection } from '../collection.ts';
import type { CheckCode } from '../diagnostics.ts';
import type { Bindings } from '../model.ts';
import { repoPath } from '../model.ts';
import { renderIndex } from '../readme.ts';
import type { Snapshot, SnapshotEntry, Source } from '../snapshot.ts';
import { ADR_DIRECTORY, INDEX_FILE } from '../spec.ts';

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

/** Runs git in a fixture repository, isolated from the calling process and the user's configuration. */
export async function gitIn(root: string, args: readonly string[]): Promise<void> {
  await git(isolatedRepository(root, { ...process.env, ...FIXTURE_IDENTITY }), args);
}

const encoder = new TextEncoder();

function bytesOf(file: FileContent): Uint8Array {
  if (typeof file === 'string') {
    return encoder.encode(file);
  }
  if (file instanceof Uint8Array) {
    return file;
  }
  return typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
}

function snapshotOf(tree: FileTree): Snapshot {
  const entries = Object.entries(tree).flatMap(([path, content]): SnapshotEntry[] => {
    const name = path.slice(ADR_DIRECTORY.length + 1);
    return path.startsWith(`${ADR_DIRECTORY}/`) && !name.includes('/')
      ? [{ name, kind: 'file', bytes: bytesOf(content) }]
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

export async function materialize(root: string, repository: FixtureRepository): Promise<void> {
  const bindings = repository.bindings ?? {};
  await createRepository(
    root,
    {
      commits: (repository.commits ?? []).map((files) => ({ files })),
      ...(repository.staged === undefined ? {} : { staged: repository.staged }),
      ...(repository.worktree === undefined ? {} : { worktree: repository.worktree }),
    },
    { prepare: async (tree) => withIndex(root, tree, bindings) },
  );
}

/** Codes reported by `adr:check` on a freshly built fixture repository. */
export async function checkFixture(repository: FixtureRepository): Promise<readonly CheckCode[]> {
  await using directory = await createTemporaryDirectory('adr-fixture');
  const origin = join(directory.path, 'origin');
  await materialize(origin, repository);
  let root = origin;
  if (repository.shallow === true) {
    root = join(directory.path, 'shallow');
    await git(isolatedRepository(directory.path), ['clone', '--quiet', '--depth', '1', `file://${origin}`, root]);
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
    runProof: async (proof) => Promise.resolve(proof === FAKE_PROOFS.passing),
  });
  return report.diagnostics.map((diagnostic) => diagnostic.code);
}
