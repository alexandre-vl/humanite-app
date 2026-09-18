import { APP_DIRECTORY, BUNDLED_FILES } from '@huma/architecture';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { expect, test } from 'vitest';
import type { WorkspacePackage } from './workspace.ts';
import { readWorkspace } from './workspace.ts';

/**
 * The workspace packages the app loads at runtime: its own `dependencies`, then theirs, down to the leaves. A
 * development dependency stays out — nothing it holds reaches the bundle Metro builds.
 */
function bundledPackages(packages: readonly WorkspacePackage[]): readonly WorkspacePackage[] {
  const byName = new Map(packages.flatMap((each) => (each.name === null ? [] : [[each.name, each] as const])));
  const app = packages.find((each) => each.directory === APP_DIRECTORY);
  const reached = new Map<string, WorkspacePackage>();
  const walk = (from: WorkspacePackage): void => {
    for (const name of from.specifiers.dependencies.keys()) {
      const dependency = byName.get(name);
      if (dependency !== undefined && !reached.has(name)) {
        reached.set(name, dependency);
        walk(dependency);
      }
    }
  };
  if (app !== undefined) {
    walk(app);
  }
  return [...reached.values()];
}

const workspace = await readWorkspace(await findWorkspaceRoot(import.meta.dirname));
const bundled = bundledPackages(workspace.packages);
const directories = bundled.map((each) => each.directory).toSorted((left, right) => left.localeCompare(right));

test('the app reaches workspace packages at runtime', () => {
  expect(directories.length).toBeGreaterThan(0);
});

test('every package the app bundles is read as Hermes code, not as Node code', () => {
  const covered = directories.filter((directory) => BUNDLED_FILES.some((glob) => glob.startsWith(`${directory}/`)));
  expect(covered).toEqual(directories);
});

test('every glob of the bundle names a package the app actually reaches', () => {
  const named = BUNDLED_FILES.map((glob) => directories.find((directory) => glob.startsWith(`${directory}/`)) ?? glob);
  expect(named.filter((name) => !directories.includes(name))).toEqual([]);
});
