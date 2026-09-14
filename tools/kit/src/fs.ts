import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
