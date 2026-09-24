import { constants } from 'node:fs';
import { access, mkdtemp, readdir, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { errnoCode } from './errors.ts';

export type TemporaryDirectory = AsyncDisposable & Readonly<{ path: string }>;

/**
 * An empty directory under the OS temporary directory, removed with its content on `await using` disposal.
 *
 * The path is the one `realpath` gives, not the one `mkdtemp` returns: on macOS `tmpdir()` sits under `/var`, a
 * symlink to `/private/var`, so an unresolved temporary root and a file resolved beneath it disagree on their common
 * ancestor. A repo-relative path taken between the two then escapes with `..`, which `repoPath` rejects — every proof
 * that judges a filled temporary workspace crashed here on macOS, and nowhere else.
 */
export async function temporaryDirectory(prefix: string): Promise<TemporaryDirectory> {
  const path = await realpath(await mkdtemp(join(tmpdir(), `${prefix}-`)));
  return {
    path,
    [Symbol.asyncDispose]: async () => {
      await rm(path, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}

/**
 * A temporary directory `fill` prepares before it reaches its caller, disposed with it afterwards. A failure while
 * filling it removes it at once: between `mkdtemp` and the caller's `await using`, nothing else would.
 */
export async function temporaryDirectoryWith<Result extends object>(
  prefix: string,
  fill: (path: string) => Promise<Result>,
): Promise<AsyncDisposable & Result> {
  const directory = await temporaryDirectory(prefix);
  try {
    return { ...(await fill(directory.path)), [Symbol.asyncDispose]: directory[Symbol.asyncDispose] };
  } catch (error) {
    await directory[Symbol.asyncDispose]();
    throw error;
  }
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

/** Whether the process may reach `path` as `mode` asks, `F_OK` by default: a reason not to reach it answers `false`. */
export const isAccessible = async (path: string, mode: number = constants.F_OK): Promise<boolean> =>
  access(path, mode).then(
    () => true,
    () => false,
  );

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
