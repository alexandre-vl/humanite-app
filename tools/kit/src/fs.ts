import { mkdtemp, readdir, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { errnoCode } from './errors.ts';

export type TemporaryDirectory = AsyncDisposable & Readonly<{ path: string }>;

/** An empty directory under the OS temporary directory, removed with its content on `await using` disposal. */
export async function temporaryDirectory(prefix: string): Promise<TemporaryDirectory> {
  const path = await mkdtemp(join(tmpdir(), `${prefix}-`));
  return {
    path,
    [Symbol.asyncDispose]: async () => {
      await rm(path, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}

/** Names in a directory, `null` when the path is not a directory that can be read. */
export async function directoryNames(path: string): Promise<readonly string[] | null> {
  try {
    return await readdir(path);
  } catch {
    return null;
  }
}

/** The absolute path with the symbolic links of its longest existing part resolved, the missing rest kept as is. */
export async function resolveExistingPath(path: string): Promise<string> {
  const missing: string[] = [];
  for (let existing = resolve(path); ; existing = dirname(existing)) {
    try {
      return join(await realpath(existing), ...missing.toReversed());
    } catch {
      if (dirname(existing) === existing) {
        return resolve(path);
      }
      missing.push(basename(existing));
    }
  }
}

/** Text of a UTF-8 file, `null` when it does not exist; any other failure is thrown. */
export async function readTextIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
