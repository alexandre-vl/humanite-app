import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Thrown for a wrong invocation: the message is shown as is and the command exits with 2. */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}

/** The repository root: the nearest directory, from `start` upwards, that holds `pnpm-workspace.yaml`. */
export async function findRoot(start: string = process.cwd()): Promise<string> {
  let directory = start;
  for (;;) {
    try {
      await access(join(directory, 'pnpm-workspace.yaml'));
      return directory;
    } catch {
      const parent = dirname(directory);
      if (parent === directory) {
        throw new UsageError(`Aucun pnpm-workspace.yaml au-dessus de ${start}`);
      }
      directory = parent;
    }
  }
}
