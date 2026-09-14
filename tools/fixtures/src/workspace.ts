import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { toRepoPath } from '@huma/kit/paths';

/** Content of a fixture file; `mode` sets permission bits, `0o755` for an executable. */
export type FileContent = string | Uint8Array | Readonly<{ content: string | Uint8Array; mode: number }>;

/** Repository-relative POSIX path → content. */
export type FileTree = Readonly<Record<string, FileContent>>;

export type TemporaryDirectory = AsyncDisposable & Readonly<{ path: string }>;

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

/** Creates an empty directory under the OS temporary directory, removed on `await using` disposal. */
export async function createTemporaryDirectory(prefix: string): Promise<TemporaryDirectory> {
  const path = await mkdtemp(join(tmpdir(), `${prefix}-`));
  return {
    path,
    [Symbol.asyncDispose]: async () => {
      await rm(path, { recursive: true, force: true, maxRetries: 3 });
    },
  };
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

/** Deletes the files of `previous` that `next` does not keep, then writes `next`. */
export async function replaceTree(root: string, previous: FileTree, next: FileTree): Promise<void> {
  for (const path of Object.keys(previous).filter((known) => !Object.hasOwn(next, known))) {
    await rm(join(root, path), { force: true });
  }
  await writeTree(root, next);
}
