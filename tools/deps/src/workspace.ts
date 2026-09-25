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
  /**
   * Directories the package's TypeScript projects reference, relative to the root: its `tsconfig.json`, and any
   * `tsconfig.<name>.json` beside it for files that run elsewhere — an app's Node configuration. `null` without a
   * `tsconfig.json`.
   */
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
  /**
   * Each installed instance, keyed `name@version` followed by the peers it was resolved with, and the resolved version
   * of each of its dependencies, optional ones included: one package gets one instance per distinct set of peers.
   */
  snapshots: ReadonlyMap<string, ReadonlyMap<string, string>>;
}>;

/** A package of the lockfile: `name` and `version` of a key such as `@expo/cli@57.0.24(zod@3.25.76)`. */
export type PackageKey = Readonly<{ name: string; version: string }>;

/** A lockfile key: a name, scoped or not, `@`, then a version, possibly followed by the peers of an instance. */
const PACKAGE_KEY = /^(?<name>(?:@[^@/]+\/)?[^@/]+)@(?<version>[^(]+)(?:\(.*\))?$/u;

/** The name and version of a lockfile key, the peers of an instance dropped. */
export function parsePackageKey(key: string): PackageKey {
  const groups = PACKAGE_KEY.exec(key)?.groups;
  const name = groups?.['name'];
  const version = groups?.['version'];
  if (name === undefined || version === undefined) {
    throw new Error(`clé de lockfile illisible : ${key}`);
  }
  return { name, version };
}

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

const RESOLVED_GROUP = z.record(z.string(), z.string()).optional();

const KEY = z.string().regex(PACKAGE_KEY);

const LOCKFILE = z.object({
  lockfileVersion: z.string(),
  catalogs: z.object({ default: z.record(z.string(), LOCKED).optional() }).optional(),
  importers: z.record(
    z.string(),
    z.object({ dependencies: LOCKED_GROUP, devDependencies: LOCKED_GROUP, optionalDependencies: LOCKED_GROUP }),
  ),
  packages: z
    .record(
      KEY,
      z.object({
        peerDependencies: z.record(z.string(), z.string()).optional(),
        peerDependenciesMeta: z.record(z.string(), z.object({ optional: z.boolean().optional() })).optional(),
      }),
    )
    .optional(),
  snapshots: z.record(KEY, z.object({ dependencies: RESOLVED_GROUP, optionalDependencies: RESOLVED_GROUP })).optional(),
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
    snapshots: new Map(
      Object.entries(lockfile.snapshots ?? {}).map(([key, snapshot]) => [
        key,
        new Map([
          ...Object.entries(snapshot.dependencies ?? {}),
          ...Object.entries(snapshot.optionalDependencies ?? {}),
        ]),
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

/** A TypeScript project at the root of a package: `tsconfig.json`, or `tsconfig.<name>.json` beside it. */
const PROJECT = /^tsconfig(?:\.[a-z]+)?\.json$/u;

/** The directories every project of the package at `directory` references, once each, in the order first written. */
export async function readReferences(root: string, directory: string): Promise<readonly string[] | null> {
  if ((await readTextIfExists(join(root, directory, 'tsconfig.json'))) === null) {
    return null;
  }
  const projects = (await readdir(join(root, directory))).filter((name) => PROJECT.test(name)).toSorted(compareText);
  const references = new Set<string>();
  for (const project of projects) {
    const parsed = TSCONFIG.parse(JSON.parse(await readFile(join(root, directory, project), 'utf8')));
    for (const reference of parsed.references ?? []) {
      const target = resolve(root, directory, reference.path);
      const inside = relative(root, target.endsWith('.json') ? dirname(target) : target)
        .split('\\')
        .join('/');
      references.add(inside === '' ? '.' : inside);
    }
  }
  return [...references];
}

async function readPackage(root: string, directory: string): Promise<WorkspacePackage> {
  const manifest = MANIFEST.parse(JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8')));
  const references = await readReferences(root, directory);
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

/**
 * The pnpm settings a workspace may write, with the values pnpm 11 accepts: a setting outside this type cannot be
 * written, so a misspelt one is never silently ignored by pnpm.
 */
type PnpmSettings = Readonly<{
  nodeLinker: 'isolated' | 'hoisted' | 'pnp';
  enableGlobalVirtualStore: boolean;
  strictDepBuilds: boolean;
  /** Packages whose install scripts run (`true`) or are skipped (`false`); any other script fails the install. */
  allowBuilds: Readonly<Record<string, boolean>>;
  strictPeerDependencies: boolean;
  /** Whether pnpm installs, at the newest version it finds, a required peer that no package declares. */
  autoInstallPeers: boolean;
  pmOnFail: 'download' | 'error' | 'warn' | 'ignore';
  verifyDepsBeforeRun: 'install' | 'warn' | 'error' | 'prompt' | false;
  /** Minutes since publication before a version can be installed. */
  minimumReleaseAge: number;
  catalogMode: 'strict' | 'prefer' | 'manual';
  peerDependencyRules: Readonly<{
    /** Peers an instance may lack without pnpm warning or failing. */
    ignoreMissing: readonly string[];
  }>;
  /**
   * Fixes laid over installed packages: the patch file for each exact `name@version` it was written against. pnpm
   * fails the install when a patch no longer applies, and when no installed package is the version it names — so a
   * fix goes with the release it was written for instead of silently outliving it.
   */
  patchedDependencies: Readonly<Record<string, string>>;
}>;

/** What `pnpm-workspace.yaml` holds: package globs, pnpm settings and the default catalog. */
export type WorkspaceFile = Readonly<{
  packages: readonly string[];
  settings: PnpmSettings;
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
