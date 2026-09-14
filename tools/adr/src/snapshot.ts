import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { isRepository, listFiles, listIndexEntries, readObjects } from './git.ts';
import { ADR_DIRECTORY } from './spec.ts';

export type Source = 'worktree' | 'index';

export type SnapshotEntry =
  Readonly<{ name: string; kind: 'file'; bytes: Uint8Array }> | Readonly<{ name: string; kind: 'directory' }>;

/** What `adr:check` reads: the entries directly under `docs/adr` and every repository file, from one source. */
export type Snapshot = Readonly<{
  source: Source;
  entries: readonly SnapshotEntry[];
  files: ReadonlySet<string>;
}>;

async function walkFiles(root: string, directory: string, files: Set<string>): Promise<void> {
  let dirents: Dirent[];
  try {
    dirents = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const dirent of dirents) {
    const path = join(directory, dirent.name);
    if (dirent.isDirectory() && dirent.name !== '.git' && dirent.name !== 'node_modules') {
      await walkFiles(root, path, files);
    } else if (dirent.isFile()) {
      files.add(relative(root, path).split(sep).join('/'));
    }
  }
}

async function readWorktreeEntries(root: string): Promise<readonly SnapshotEntry[]> {
  const directory = join(root, ADR_DIRECTORY);
  let dirents: Dirent[];
  try {
    dirents = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const entries = await Promise.all(
    dirents.map(async (dirent): Promise<SnapshotEntry> =>
      dirent.isDirectory()
        ? { name: dirent.name, kind: 'directory' }
        : { name: dirent.name, kind: 'file', bytes: await readFile(join(directory, dirent.name)) },
    ),
  );
  return entries.toSorted((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

async function readIndexEntries(root: string): Promise<readonly SnapshotEntry[]> {
  const indexEntries = await listIndexEntries(root, ADR_DIRECTORY);
  const objects = await readObjects(
    root,
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
  return [...entries, ...[...directories].map((name): SnapshotEntry => ({ name, kind: 'directory' }))].toSorted(
    (left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  );
}

export async function readSnapshot(root: string, source: Source): Promise<Snapshot> {
  if (source === 'index') {
    return { source, entries: await readIndexEntries(root), files: await listFiles(root, 'index') };
  }
  let files: ReadonlySet<string>;
  if (await isRepository(root)) {
    files = await listFiles(root, 'worktree');
  } else {
    const walked = new Set<string>();
    await walkFiles(root, root, walked);
    files = walked;
  }
  return { source, entries: await readWorktreeEntries(root), files };
}
