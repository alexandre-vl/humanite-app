import { join } from 'node:path';
import type { FileTree } from '@huma/fixtures';
import { createRepository, fileBytes, writeTree } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import type { FileSource, GitRepository } from '@huma/kit/git';
import { git, isolatedRepository } from '@huma/kit/git';
import type { Environment } from '@huma/kit/process';
import { repoPath } from '@huma/kit/paths';
import type { Bindings, BindingsSource, ProofRunner } from '../model/bindings.ts';
import { checkSnapshot, runChecks } from '../repository/check.ts';
import type { Acknowledgment } from '../repository/history.ts';
import type { Snapshot, SnapshotEntry } from '../repository/snapshot.ts';
import type { CheckCode } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { ADR_DIRECTORY } from '../spec/layout.ts';

/** Proof ids understood by the fixture runners: one that always passes, one that always fails. */
export const FAKE_PROOFS = { passing: 'fake/passing', failing: 'fake/failing' } as const;

const FIXTURE_BINDINGS_PATH = repoPath('bindings.ts');

export const bindingsSource = (bindings: Bindings): BindingsSource => ({
  bindings,
  path: FIXTURE_BINDINGS_PATH,
  text: null,
  proofs: new Set(Object.values(FAKE_PROOFS)),
});

export const runFakeProof: ProofRunner = async (proof) => Promise.resolve(proof === FAKE_PROOFS.passing);

/** A snapshot of a file tree, as `readSnapshot` would read it from a working tree. */
function snapshotOf(files: FileTree): Snapshot {
  const directories = new Set<string>();
  const entries: SnapshotEntry[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith(`${ADR_DIRECTORY}/`)) {
      continue;
    }
    const [name = '', ...nested] = path.slice(ADR_DIRECTORY.length + 1).split('/');
    if (nested.length > 0) {
      directories.add(name);
    } else {
      entries.push({ name, kind: 'file', bytes: fileBytes(content) });
    }
  }
  return {
    source: 'worktree',
    entries: [...entries, ...[...directories].map((name): SnapshotEntry => ({ name, kind: 'directory' }))],
    files: new Set(Object.keys(files).map(repoPath)),
  };
}

export type FilesOptions = Readonly<{ bindings?: Bindings; formats?: FormatRegistry }>;

/** Codes of every check that needs no git history, run in memory on `files`. */
export function checkFiles(files: FileTree, options: FilesOptions = {}): readonly CheckCode[] {
  return checkSnapshot(snapshotOf(files), bindingsSource(options.bindings ?? {}), options.formats).diagnostics.map(
    (diagnostic) => diagnostic.code,
  );
}

export type HistoryFixture = Readonly<{
  /** Successive full trees of the repository. */
  commits?: readonly FileTree[];
  staged?: FileTree;
  worktree?: FileTree;
  bindings?: Bindings;
  source?: FileSource;
  /** Check a `git clone --depth 1` of the repository. */
  shallow?: boolean;
  environment?: Environment;
  formats?: FormatRegistry;
  /** Acknowledgments computed from the repository, once its commits exist. */
  acknowledgments?: (repository: GitRepository) => Promise<readonly Acknowledgment[]>;
  /** Git commands run after the plan, a merge for instance. */
  afterwards?: (repository: GitRepository) => Promise<void>;
}>;

/** Codes of every check, history included, on a fresh repository built from `fixture`. */
export async function checkHistoryFixture(fixture: HistoryFixture): Promise<readonly CheckCode[]> {
  await using directory = await temporaryDirectory('adr-history');
  const origin = join(directory.path, 'origin');
  let repository = await createRepository(origin, {
    commits: (fixture.commits ?? []).map((files) => ({ files })),
    ...(fixture.staged === undefined ? {} : { staged: fixture.staged }),
    ...(fixture.worktree === undefined ? {} : { worktree: fixture.worktree }),
  });
  await fixture.afterwards?.(repository);
  if (fixture.shallow === true) {
    const clone = join(directory.path, 'shallow');
    await git(isolatedRepository(directory.path), ['clone', '--quiet', '--depth', '1', `file://${origin}`, clone]);
    repository = isolatedRepository(clone);
  }
  const report = await runChecks({
    repository,
    source: fixture.source ?? 'worktree',
    bindings: bindingsSource(fixture.bindings ?? {}),
    runProof: runFakeProof,
    environment: fixture.environment ?? {},
    acknowledgments: (await fixture.acknowledgments?.(repository)) ?? [],
    ...(fixture.formats === undefined ? {} : { formats: fixture.formats }),
  });
  return report.diagnostics.map((diagnostic) => diagnostic.code);
}

/** Codes of every check on a plain directory that is not a git repository. */
export async function checkPlainDirectory(files: FileTree): Promise<readonly CheckCode[]> {
  await using directory = await temporaryDirectory('adr-plain');
  await writeTree(directory.path, files);
  const report = await runChecks({
    repository: isolatedRepository(directory.path),
    source: 'worktree',
    bindings: bindingsSource({}),
    runProof: runFakeProof,
    environment: {},
    acknowledgments: [],
  });
  return report.diagnostics.map((diagnostic) => diagnostic.code);
}
