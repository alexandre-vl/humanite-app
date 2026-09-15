import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { errnoCode } from '@huma/kit/errors';
import { compareText } from '@huma/kit/text';

/** Where the kernel exposes its sysctls. */
const SYSCTL_ROOT = '/proc/sys';

/** Owner read and write: the sysctls that can change at run time. */
const OWNER_READ_WRITE = 0o600;

/** A sysctl value as the guard records it: its lines joined with spaces, tabs turned into spaces. */
export const sysctlValue = (content: string): string => content.replace(/\n$/u, '').replaceAll(/[\t\n]/gu, ' ');

/**
 * The values of the sysctls under `root` that can change and that this process can read, keyed by path; the `net`
 * tree is left out, since each network namespace has its own and a container writes only its own.
 */
export async function readableSysctls(root: string = SYSCTL_ROOT): Promise<ReadonlyMap<string, string>> {
  const values = new Map<string, string>();
  const visit = async (directory: string): Promise<void> => {
    const names = await readdir(directory).catch((error: unknown) => {
      if (errnoCode(error) === 'EACCES') {
        return [];
      }
      throw error;
    });
    for (const name of names.toSorted(compareText)) {
      const path = join(directory, name);
      if (path === join(root, 'net')) {
        continue;
      }
      const stats = await stat(path);
      if (stats.isDirectory()) {
        await visit(path);
      } else if ((stats.mode & OWNER_READ_WRITE) === OWNER_READ_WRITE) {
        try {
          values.set(path, sysctlValue(await readFile(path, 'utf8')));
        } catch (error) {
          if (errnoCode(error) !== 'EACCES' && errnoCode(error) !== 'EPERM') {
            throw error;
          }
        }
      }
    }
  };
  await visit(root);
  return values;
}
