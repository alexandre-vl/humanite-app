import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord } from '@huma/unknown';
import { defineConfig } from 'vitest/config';

/** The name a package declares, or `null` when a directory under a workspace root is not one. */
function packageName(directory: string): string | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    const name = isRecord(parsed) ? parsed['name'] : undefined;
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

/**
 * One project per workspace package under `packages/` and `tools/`. A project given to Vitest as a glob string does not
 * inherit the root test config, so each is written out here to carry `fsModuleCache`: transformed modules are kept
 * under `node_modules/.vitest-cache` and reused across runs, keyed on each file's contents, which was half the run
 * redone every time (transforms measured at 40–60 % of several projects' time, 15/09/2026). The package's own name is
 * kept, so `--project @huma/x` and the reports still name it.
 */
const projects = ['packages', 'tools'].flatMap((root) =>
  readdirSync(join(import.meta.dirname, root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = join(import.meta.dirname, root, entry.name);
      const name = packageName(directory);
      return name === null ? [] : [{ extends: true, test: { name, root: directory, fsModuleCache: true } }];
    }),
);

export default defineConfig({ test: { projects } });
