import { chmod, mkdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { errnoCode } from '@huma/kit/errors';
import { toRepoPath } from '@huma/kit/paths';
import { isRecord } from '@huma/kit/records';

/** Content of a fixture file; `mode` sets permission bits, `0o755` for an executable. */
export type FileContent = string | Uint8Array | Readonly<{ content: string | Uint8Array; mode: number }>;

/** Repository-relative POSIX path → content. */
export type FileTree = Readonly<Record<string, FileContent>>;

const encoder = new TextEncoder();

/** Bytes a fixture file holds, text encoded as UTF-8. */
export function fileBytes(file: FileContent): Uint8Array {
  if (typeof file === 'string') {
    return encoder.encode(file);
  }
  if (file instanceof Uint8Array) {
    return file;
  }
  return typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
}

/** Writes every file of `tree` under `root`, creating parent directories; a path may not leave `root`. */
export async function writeTree(root: string, tree: FileTree): Promise<void> {
  for (const [path, file] of Object.entries(tree)) {
    const target = resolve(root, path);
    if (toRepoPath(root, target) === null) {
      throw new Error(`Chemin hors de la racine de la fixture : ${path}`);
    }
    await mkdir(dirname(target), { recursive: true });
    if (typeof file === 'string' || file instanceof Uint8Array) {
      await writeFile(target, file);
    } else {
      await writeFile(target, file.content);
      await chmod(target, file.mode);
    }
  }
}

/**
 * A tsconfig's JSON without its `references`: they point at workspace packages a fixture tree does not hold, so a copy
 * would carry dangling references that crash tsconfck. A fixture imports no workspace package, so it never needs them.
 */
export function withoutReferences(tsconfig: string): string {
  const parsed: unknown = JSON.parse(tsconfig);
  if (!isRecord(parsed)) {
    return tsconfig;
  }
  const entries = Object.entries(parsed).filter(([key]) => key !== 'references');
  return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`;
}

/** Parent directories of `path` inside the tree, deepest first. */
const parentsOf = (path: string): readonly string[] =>
  path
    .split('/')
    .slice(0, -1)
    .map((segment, index, segments) => segments.slice(0, index + 1).join('/'))
    .toReversed();

/**
 * Deletes the files of `previous` that `next` does not keep and the directories they leave empty, then writes `next`:
 * the directory on disk holds exactly the files of `next`.
 */
export async function replaceTree(root: string, previous: FileTree, next: FileTree): Promise<void> {
  const dropped = Object.keys(previous).filter((known) => !Object.hasOwn(next, known));
  for (const path of dropped) {
    await rm(join(root, path), { force: true });
  }
  const directories = [...new Set(dropped.flatMap(parentsOf))].toSorted(
    (left, right) => right.split('/').length - left.split('/').length,
  );
  for (const directory of directories) {
    try {
      await rmdir(join(root, directory));
    } catch (error) {
      if (errnoCode(error) !== 'ENOTEMPTY' && errnoCode(error) !== 'ENOENT') {
        throw error;
      }
    }
  }
  await writeTree(root, next);
}
