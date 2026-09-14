import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileSource, GitRepository } from '@huma/kit/git';
import { listFiles, listIndexEntries, readObjects } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import { ADR_DIRECTORY } from '../spec/layout.ts';

export type SnapshotEntry =
  Readonly<{ name: string; kind: 'file'; bytes: Uint8Array }> | Readonly<{ name: string; kind: 'directory' }>;

/** What a check reads from one source: the entries directly under the ADR directory and every repository file. */
export type Snapshot = Readonly<{
  source: FileSource;
  entries: readonly SnapshotEntry[];
  files: ReadonlySet<RepoPath>;
}>;

const byName = (left: SnapshotEntry, right: SnapshotEntry): number => compareText(left.name, right.name);

async function readWorktreeEntries(root: string): Promise<readonly SnapshotEntry[]> {
  let dirents: Dirent[];
  try {
    dirents = await readdir(join(root, ADR_DIRECTORY), { withFileTypes: true });
  } catch {
    return [];
  }
  const entries = await Promise.all(
    dirents.map(async (dirent): Promise<SnapshotEntry> =>
      dirent.isDirectory()
        ? { name: dirent.name, kind: 'directory' }
        : { name: dirent.name, kind: 'file', bytes: await readFile(join(root, ADR_DIRECTORY, dirent.name)) },
    ),
  );
  return entries.toSorted(byName);
}

async function readIndexEntries(repository: GitRepository): Promise<readonly SnapshotEntry[]> {
  const indexEntries = await listIndexEntries(repository, ADR_DIRECTORY);
  const objects = await readObjects(
    repository,
    indexEntries.map((entry) => entry.object),
  );
  const directories = new Set<string>();
  const entries: SnapshotEntry[] = [];
  for (const entry of indexEntries) {
    const [name = '', ...nested] = entry.path.slice(ADR_DIRECTORY.length + 1).split('/');
    if (nested.length > 0) {
      directories.add(name);
    } else {
      entries.push({ name, kind: 'file', bytes: objects.get(entry.object) ?? new Uint8Array() });
    }
  }
  return [...entries, ...[...directories].map((name): SnapshotEntry => ({ name, kind: 'directory' }))].toSorted(byName);
}

export async function readSnapshot(repository: GitRepository, source: FileSource): Promise<Snapshot> {
  const [entries, files] = await Promise.all([
    source === 'index' ? readIndexEntries(repository) : readWorktreeEntries(repository.root),
    listFiles(repository, source),
  ]);
  return { source, entries, files };
}
