import type { Diagnostic } from '@huma/kit/diagnostics';
import { compareDiagnostics } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import type { DepsCode } from './checks.ts';
import { depsFinding } from './checks.ts';
import type { Locked, Workspace, WorkspacePackage } from './workspace.ts';
import { DEPENDENCY_KINDS, LOCKFILE_NAME, WORKSPACE_FILE_NAME } from './workspace.ts';

export type DependencyPolicy = Readonly<{
  /** Packages the whole workspace resolves to a single version. */
  singleVersion: readonly string[];
}>;

/** An exact semantic version, prerelease and build allowed: no range, no tag. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

const LOCKFILE = repoPath(LOCKFILE_NAME);

const WORKSPACE_FILE = repoPath(WORKSPACE_FILE_NAME);

const fileOf = (directory: string, name: string): RepoPath =>
  repoPath(directory === '.' ? name : `${directory}/${name}`);

/** The version a locked entry resolves to, peer suffix removed: `57.0.22(@babel/core@7.29.7)` gives `57.0.22`. */
const resolvedVersion = (locked: string): string => locked.split('(')[0] ?? locked;

function checkLockfile(workspace: Workspace): readonly Diagnostic<DepsCode>[] {
  const { lockfile } = workspace;
  if (lockfile.version !== '9.0') {
    return [depsFinding('deps/lockfile-version', LOCKFILE, { version: lockfile.version })];
  }
  const directories = new Set(workspace.packages.map((each) => each.directory));
  return [
    ...[...directories]
      .filter((directory) => !lockfile.importers.has(directory))
      .map((directory) => depsFinding('deps/importer-missing', LOCKFILE, { directory })),
    ...[...lockfile.importers.keys()]
      .filter((directory) => !directories.has(directory))
      .map((directory) => depsFinding('deps/importer-unknown', LOCKFILE, { directory })),
  ];
}

function checkCatalog(workspace: Workspace): readonly Diagnostic<DepsCode>[] {
  const used = new Set(
    workspace.packages.flatMap((each) =>
      DEPENDENCY_KINDS.flatMap((kind) =>
        [...each.specifiers[kind]].filter(([, specifier]) => specifier === 'catalog:').map(([name]) => name),
      ),
    ),
  );
  return [...workspace.catalog].flatMap(([name, version]) => {
    const locked = workspace.lockfile.catalog.get(name)?.version;
    return [
      ...(EXACT_VERSION.test(version) ? [] : [depsFinding('deps/catalog-range', WORKSPACE_FILE, { name, version })]),
      ...(locked === undefined || locked === version
        ? []
        : [depsFinding('deps/catalog-stale', WORKSPACE_FILE, { name, version, locked })]),
      ...(used.has(name) ? [] : [depsFinding('deps/catalog-unused', WORKSPACE_FILE, { name })]),
    ];
  });
}

function checkPackage(
  each: WorkspacePackage,
  workspace: Workspace,
  byName: ReadonlyMap<string, WorkspacePackage>,
): readonly Diagnostic<DepsCode>[] {
  const manifest = fileOf(each.directory, 'package.json');
  const findings: Diagnostic<DepsCode>[] = [];
  const locked: ReadonlyMap<string, Locked> = workspace.lockfile.importers.get(each.directory) ?? new Map();
  const declared = new Set<string>();
  for (const kind of DEPENDENCY_KINDS) {
    for (const [name, specifier] of each.specifiers[kind]) {
      declared.add(name);
      const expected = byName.has(name) ? 'workspace:*' : 'catalog:';
      if (specifier !== expected) {
        findings.push(depsFinding('deps/specifier-form', manifest, { name, specifier, expected }));
      }
      const entry = locked.get(name);
      if (kind !== 'peerDependencies' && entry !== undefined && entry.specifier !== specifier) {
        findings.push(depsFinding('deps/importer-stale', manifest, { name, specifier, locked: entry.specifier }));
      }
    }
  }
  for (const [name, entry] of locked) {
    const peers: ReadonlyMap<string, boolean> =
      workspace.lockfile.peers.get(`${name}@${resolvedVersion(entry.version)}`) ?? new Map();
    for (const [peer, optional] of peers) {
      if (!optional && !declared.has(peer)) {
        findings.push(depsFinding('deps/peer-undeclared', manifest, { dependency: name, peer }));
      }
    }
  }
  if (each.references !== null && each.directory !== '.') {
    const tsconfig = fileOf(each.directory, 'tsconfig.json');
    const workspaceDependencies = [...declared].flatMap((name) => {
      const target = byName.get(name);
      return target?.references === null || target === undefined ? [] : [target];
    });
    for (const dependency of workspaceDependencies) {
      if (!each.references.includes(dependency.directory)) {
        const path = relativeDirectory(each.directory, dependency.directory);
        findings.push(depsFinding('deps/reference-missing', tsconfig, { dependency: dependency.name ?? '', path }));
      }
    }
    const dependencyDirectories = new Set(workspaceDependencies.map((dependency) => dependency.directory));
    for (const reference of each.references) {
      const target = workspace.packages.find((candidate) => candidate.directory === reference);
      if (target !== undefined && !dependencyDirectories.has(reference)) {
        findings.push(depsFinding('deps/reference-undeclared', tsconfig, { reference }));
      }
    }
  }
  return findings;
}

/** `from` to `to`, both relative to the root, as a tsconfig reference writes it. */
function relativeDirectory(from: string, to: string): string {
  const up = from === '.' ? [] : from.split('/').map(() => '..');
  return [...up, ...(to === '.' ? [] : to.split('/'))].join('/');
}

function checkSingleVersions(workspace: Workspace, policy: DependencyPolicy): readonly Diagnostic<DepsCode>[] {
  return policy.singleVersion.flatMap((name) => {
    const versions = [...workspace.lockfile.peers.keys()]
      .filter((key) => key.startsWith(`${name}@`) && !key.slice(name.length + 1).includes('@'))
      .map((key) => key.slice(name.length + 1))
      .toSorted(compareText);
    return versions.length <= 1
      ? []
      : [depsFinding('deps/single-version', LOCKFILE, { name, versions: versions.join(', ') })];
  });
}

/** Every dependency finding of a workspace. */
export function checkWorkspace(workspace: Workspace, policy: DependencyPolicy): readonly Diagnostic<DepsCode>[] {
  const byName = new Map(
    workspace.packages.flatMap((each) => (each.name === null ? [] : [[each.name, each] as const])),
  );
  return [
    ...checkLockfile(workspace),
    ...checkCatalog(workspace),
    ...workspace.packages.flatMap((each) => checkPackage(each, workspace, byName)),
    ...checkSingleVersions(workspace, policy),
  ].toSorted(compareDiagnostics);
}
