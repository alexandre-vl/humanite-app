import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { readTextIfExists } from '@huma/kit/fs';
import { compareText } from '@huma/kit/text';
import { parse, stringify } from 'yaml';
import { z } from 'zod';

/**
 * What the dependency checks read of a workspace: each package manifest with its TypeScript references, the pnpm
 * catalog, and the lockfile pnpm resolved from them. Reading validates shapes; judging is left to `check.ts`.
 */

export const DEPENDENCY_KINDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

export type DependencyKind = (typeof DEPENDENCY_KINDS)[number];

export type WorkspacePackage = Readonly<{
  /** Directory relative to the workspace root, `.` for the root. */
  directory: string;
  name: string | null;
  /** Specifiers by kind, as written in `package.json`. */
  specifiers: Readonly<Record<DependencyKind, ReadonlyMap<string, string>>>;
  /** Directories the `tsconfig.json` references, relative to the root; `null` without a `tsconfig.json`. */
  references: readonly string[] | null;
}>;

export type Locked = Readonly<{ specifier: string; version: string }>;

export type Lockfile = Readonly<{
  version: string;
  catalog: ReadonlyMap<string, Locked>;
  /** Locked dependencies of each importer, every kind merged, by importer directory. */
  importers: ReadonlyMap<string, ReadonlyMap<string, Locked>>;
  /** Peer dependencies of each resolved package `name@version`: `true` for an optional peer. */
  peers: ReadonlyMap<string, ReadonlyMap<string, boolean>>;
}>;

export type Workspace = Readonly<{
  packages: readonly WorkspacePackage[];
  /** The default catalog of `pnpm-workspace.yaml`. */
  catalog: ReadonlyMap<string, string>;
  lockfile: Lockfile;
}>;

const SPECIFIERS = z.record(z.string(), z.string());

const MANIFEST = z.object({
  name: z.string().optional(),
  dependencies: SPECIFIERS.optional(),
  devDependencies: SPECIFIERS.optional(),
  optionalDependencies: SPECIFIERS.optional(),
  peerDependencies: SPECIFIERS.optional(),
});

const TSCONFIG = z.object({ references: z.array(z.object({ path: z.string() })).optional() });

const WORKSPACE_FILE = z.object({
  packages: z.array(z.string()),
  catalog: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const LOCKED = z.object({ specifier: z.string(), version: z.string() });

const LOCKED_GROUP = z.record(z.string(), LOCKED).optional();

const LOCKFILE = z.object({
  lockfileVersion: z.string(),
  catalogs: z.object({ default: z.record(z.string(), LOCKED).optional() }).optional(),
  importers: z.record(
    z.string(),
    z.object({ dependencies: LOCKED_GROUP, devDependencies: LOCKED_GROUP, optionalDependencies: LOCKED_GROUP }),
  ),
  packages: z
    .record(
      z.string(),
      z.object({
        peerDependencies: z.record(z.string(), z.string()).optional(),
        peerDependenciesMeta: z.record(z.string(), z.object({ optional: z.boolean().optional() })).optional(),
      }),
    )
    .optional(),
});

export const WORKSPACE_FILE_NAME = 'pnpm-workspace.yaml';

export const LOCKFILE_NAME = 'pnpm-lock.yaml';

const toMap = (record: Readonly<Record<string, string>> | undefined): ReadonlyMap<string, string> =>
  new Map(Object.entries(record ?? {}).toSorted(([left], [right]) => compareText(left, right)));

/** The lockfile of pnpm 9 format, reduced to what the checks compare. */
export function readLockfile(text: string): Lockfile {
  const lockfile = LOCKFILE.parse(parse(text));
  return {
    version: lockfile.lockfileVersion,
    catalog: new Map(Object.entries(lockfile.catalogs?.default ?? {})),
    importers: new Map(
      Object.entries(lockfile.importers).map(([directory, importer]) => [
        directory,
        new Map([
          ...Object.entries(importer.dependencies ?? {}),
          ...Object.entries(importer.devDependencies ?? {}),
          ...Object.entries(importer.optionalDependencies ?? {}),
        ]),
      ]),
    ),
    peers: new Map(
      Object.entries(lockfile.packages ?? {}).map(([key, entry]) => [
        key,
        new Map(
          Object.keys(entry.peerDependencies ?? {}).map((peer) => [
            peer,
            entry.peerDependenciesMeta?.[peer]?.optional === true,
          ]),
        ),
      ]),
    ),
  };
}

/** Package directories matched by `packages` globs of the form `directory/*`, sorted. */
export async function packageDirectories(root: string, globs: readonly string[]): Promise<readonly string[]> {
  const directories: string[] = [];
  for (const glob of globs) {
    const parent = glob.replace(/\/\*$/u, '');
    const names = await readdir(join(root, parent), { withFileTypes: true }).catch(() => []);
    for (const entry of names.filter((candidate) => candidate.isDirectory())) {
      const directory = posix.join(parent, entry.name);
      if ((await readTextIfExists(join(root, directory, 'package.json'))) !== null) {
        directories.push(directory);
      }
    }
  }
  return directories.toSorted(compareText);
}

async function readPackage(root: string, directory: string): Promise<WorkspacePackage> {
  const manifest = MANIFEST.parse(JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8')));
  const tsconfigText = await readTextIfExists(join(root, directory, 'tsconfig.json'));
  const references =
    tsconfigText === null
      ? null
      : (TSCONFIG.parse(JSON.parse(tsconfigText)).references ?? []).map((reference) => {
          const target = resolve(root, directory, reference.path);
          const inside = relative(root, target.endsWith('.json') ? dirname(target) : target)
            .split('\\')
            .join('/');
          return inside === '' ? '.' : inside;
        });
  return {
    directory,
    name: manifest.name ?? null,
    specifiers: {
      dependencies: toMap(manifest.dependencies),
      devDependencies: toMap(manifest.devDependencies),
      optionalDependencies: toMap(manifest.optionalDependencies),
      peerDependencies: toMap(manifest.peerDependencies),
    },
    references,
  };
}

/** What `pnpm-workspace.yaml` holds: package globs, pnpm settings and the default catalog. */
export type WorkspaceFile = Readonly<{
  packages: readonly string[];
  settings: Readonly<Record<string, string | number | boolean>>;
  catalog: Readonly<Record<string, string>>;
}>;

/** The text of `pnpm-workspace.yaml` for `file`, before formatting: globs, then settings, then the sorted catalog. */
export const renderWorkspaceFile = (file: WorkspaceFile): string =>
  stringify({
    packages: file.packages,
    ...file.settings,
    catalog: Object.fromEntries(Object.entries(file.catalog).toSorted(([left], [right]) => compareText(left, right))),
  });

/** The workspace at `root`: its packages, catalog and lockfile. */
export async function readWorkspace(root: string): Promise<Workspace> {
  const file = WORKSPACE_FILE.parse(parse(await readFile(join(root, WORKSPACE_FILE_NAME), 'utf8')));
  const directories = ['.', ...(await packageDirectories(root, file.packages))];
  const packages: WorkspacePackage[] = [];
  for (const directory of directories) {
    packages.push(await readPackage(root, directory));
  }
  return {
    packages,
    catalog: new Map(Object.entries(file.catalog ?? {}).map(([name, version]) => [name, String(version)])),
    lockfile: readLockfile(await readFile(join(root, LOCKFILE_NAME), 'utf8')),
  };
}
