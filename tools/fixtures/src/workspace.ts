import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

/** Repository-relative POSIX path → UTF-8 content. */
export type FileTree = Readonly<Record<string, string>>;

export type TemporaryDirectory = AsyncDisposable & Readonly<{ path: string }>;

/** Creates an empty directory under the OS temporary directory, removed on `await using` disposal. */
export async function createTemporaryDirectory(prefix: string): Promise<TemporaryDirectory> {
  const path = await mkdtemp(join(tmpdir(), `${prefix}-`));
  return {
    path,
    [Symbol.asyncDispose]: async () => {
      await rm(path, { recursive: true, force: true });
    },
  };
}

/** Writes every file of `tree` under `root`, creating parent directories; paths may not leave `root`. */
export async function writeTree(root: string, tree: FileTree): Promise<void> {
  for (const [path, content] of Object.entries(tree)) {
    const target = resolve(root, path);
    const inside = relative(root, target);
    if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
      throw new Error(`Chemin hors de la racine de la fixture : ${path}`);
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
}
