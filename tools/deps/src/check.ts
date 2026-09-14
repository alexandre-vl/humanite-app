import type { Diagnostic } from '@huma/kit/diagnostics';
import { compareDiagnostics } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import { satisfies, valid } from 'semver';
import type { DepsCode } from './checks.ts';
import { depsFinding } from './checks.ts';
import type { Locked, Workspace, WorkspacePackage } from './workspace.ts';
import { DEPENDENCY_KINDS, LOCKFILE_NAME, parsePackageKey, WORKSPACE_FILE_NAME } from './workspace.ts';

export type DependencyPolicy = Readonly<{
  /** Where the policy is written: findings about the policy itself point there. */
  source: RepoPath;
  /**
   * The directories holding the packages of the workspace, each with the directories whose packages its own may depend
   * on: a dependency outside that list is on the wrong package, or the package is in the wrong directory.
   */
  roots: Readonly<Record<string, readonly string[]>>;
  /** Packages installed once: another instance, even of the same version, resolved with other peers, is a second copy. */
  singleInstance: readonly string[];
  /**
   * Packages resolved to the version the workspace declares, each with the dependents allowed to keep a private copy of
   * another version: a copy that only a listed dependent loads never meets the code of the workspace.
   */
  singleVersion: Readonly<Record<string, readonly string[]>>;
}>;

/**
 * The versions a package that ships its own compatibility table tested together, which an importer's declared
 * dependencies must stay within: the modules the Expo SDK of an app bundles, for instance.
 */
export type TestedRanges = Readonly<{
  /** Directory of the importer whose dependencies the ranges bind. */
  importer: string;
  /** Who tested the ranges, as a finding names it: `expo 57.0.22`. */
  source: string;
  /** The range tested for each package name. */
  ranges: ReadonlyMap<string, string>;
}>;

/** An exact semantic version, prerelease and build allowed: no range, no tag. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

const LOCKFILE = repoPath(LOCKFILE_NAME);

const WORKSPACE_FILE = repoPath(WORKSPACE_FILE_NAME);

const fileOf = (directory: string, name: string): RepoPath =>
  repoPath(directory === '.' ? name : `${directory}/${name}`);

/** The version a locked entry resolves to, peer suffix removed: `57.0.22(@babel/core@7.29.7)` gives `57.0.22`. */
const resolvedVersion = (locked: string): string => locked.split('(')[0] ?? locked;

const sortedList = (values: Iterable<string>): string => [...new Set(values)].toSorted(compareText).join(', ');

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

/** The root of `roots` a package directory sits in: `tools` for `tools/kit`, `null` for the workspace root. */
const rootOf = (directory: string, roots: DependencyPolicy['roots']): string | null =>
  Object.keys(roots).find((root) => directory.startsWith(`${root}/`)) ?? null;

function checkPackage(
  each: WorkspacePackage,
  workspace: Workspace,
  byName: ReadonlyMap<string, WorkspacePackage>,
  policy: DependencyPolicy,
): readonly Diagnostic<DepsCode>[] {
  const manifest = fileOf(each.directory, 'package.json');
  const findings: Diagnostic<DepsCode>[] = [];
  const locked: ReadonlyMap<string, Locked> = workspace.lockfile.importers.get(each.directory) ?? new Map();
  const declared = new Set<string>();
  const root = rootOf(each.directory, policy.roots);
  for (const kind of DEPENDENCY_KINDS) {
    for (const [name, specifier] of each.specifiers[kind]) {
      declared.add(name);
      const target = byName.get(name);
      const expected = target === undefined ? 'catalog:' : 'workspace:*';
      if (specifier !== expected) {
        findings.push(depsFinding('deps/specifier-form', manifest, { name, specifier, expected }));
      }
      const entry = locked.get(name);
      if (kind !== 'peerDependencies' && entry !== undefined && entry.specifier !== specifier) {
        findings.push(depsFinding('deps/importer-stale', manifest, { name, specifier, locked: entry.specifier }));
      }
      const targetRoot = target === undefined ? null : rootOf(target.directory, policy.roots);
      if (root !== null && targetRoot !== null && !(policy.roots[root] ?? []).includes(targetRoot)) {
        findings.push(depsFinding('deps/root-dependency', manifest, { name, root, target: targetRoot }));
      }
    }
  }
  if (each.directory !== '.' && root === null) {
    findings.push(depsFinding('deps/root-unknown', manifest, { directory: each.directory }));
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

/** Registry dependencies of an importer, by name, with the version they resolve to: workspace links and runtimes left out. */
const registryDependencies = (locked: ReadonlyMap<string, Locked>): ReadonlyMap<string, string> =>
  new Map(
    [...locked]
      .filter(([, entry]) => valid(resolvedVersion(entry.version)) !== null)
      .map(([name, entry]) => [name, entry.version] as const),
  );

/**
 * Each direct dependency of an importer resolves to the version its other direct dependencies load: otherwise the
 * importer and its dependency each get their own copy, and configuration read by one never reaches the other.
 */
function checkSiblingVersions(workspace: Workspace): readonly Diagnostic<DepsCode>[] {
  return [...workspace.lockfile.importers].flatMap(([directory, locked]) => {
    const direct = registryDependencies(locked);
    return [...direct].flatMap(([dependent, instance]) =>
      [...(workspace.lockfile.snapshots.get(`${dependent}@${instance}`) ?? new Map<string, string>())].flatMap(
        ([name, loaded]) => {
          const declared = direct.get(name);
          return declared === undefined || resolvedVersion(declared) === resolvedVersion(loaded)
            ? []
            : [
                depsFinding('deps/sibling-version', fileOf(directory, 'package.json'), {
                  name,
                  version: resolvedVersion(declared),
                  dependent,
                  loaded: resolvedVersion(loaded),
                }),
              ];
        },
      ),
    );
  });
}

function checkTestedRanges(workspace: Workspace, tested: readonly TestedRanges[]): readonly Diagnostic<DepsCode>[] {
  return tested.flatMap(({ importer, source, ranges }) => {
    const direct = registryDependencies(workspace.lockfile.importers.get(importer) ?? new Map());
    return [...direct].flatMap(([name, instance]) => {
      const range = ranges.get(name);
      const version = resolvedVersion(instance);
      return range === undefined || satisfies(version, range)
        ? []
        : [depsFinding('deps/untested-version', fileOf(importer, 'package.json'), { name, version, range, source })];
    });
  });
}

/** The installed instances of each package name, as lockfile snapshot keys. */
function instancesByName(workspace: Workspace): ReadonlyMap<string, readonly string[]> {
  const instances = new Map<string, string[]>();
  for (const key of workspace.lockfile.snapshots.keys()) {
    const { name } = parsePackageKey(key);
    instances.set(name, [...(instances.get(name) ?? []), key]);
  }
  return instances;
}

function checkSingleInstances(
  policy: DependencyPolicy,
  instances: ReadonlyMap<string, readonly string[]>,
): readonly Diagnostic<DepsCode>[] {
  return policy.singleInstance.flatMap((name) => {
    const keys = instances.get(name) ?? [];
    return keys.length <= 1
      ? []
      : [
          depsFinding('deps/single-instance', LOCKFILE, {
            name,
            count: String(keys.length),
            instances: sortedList(keys),
          }),
        ];
  });
}

/** The names of the instances that depend on `name` at `version`. */
function dependentsOf(workspace: Workspace, name: string, version: string): ReadonlySet<string> {
  return new Set(
    [...workspace.lockfile.snapshots]
      .filter(([, dependencies]) => {
        const resolved = dependencies.get(name);
        return resolved !== undefined && resolvedVersion(resolved) === version;
      })
      .map(([key]) => parsePackageKey(key).name),
  );
}

function checkSingleVersions(
  workspace: Workspace,
  policy: DependencyPolicy,
  instances: ReadonlyMap<string, readonly string[]>,
): readonly Diagnostic<DepsCode>[] {
  return Object.entries(policy.singleVersion).flatMap(([name, privateTo]) => {
    const declared = new Set(
      [...workspace.lockfile.importers.values()].flatMap((dependencies) => {
        const entry = dependencies.get(name);
        return entry === undefined ? [] : [resolvedVersion(entry.version)];
      }),
    );
    const versions = new Set((instances.get(name) ?? []).map((key) => parsePackageKey(key).version));
    const findings: Diagnostic<DepsCode>[] = [];
    if (declared.size > 1 || (declared.size === 0 && versions.size > 1)) {
      const conflicting = declared.size > 1 ? declared : versions;
      findings.push(depsFinding('deps/single-version', LOCKFILE, { name, versions: sortedList(conflicting) }));
    }
    const holders = new Set<string>();
    const copies = declared.size === 0 ? [] : [...versions].filter((version) => !declared.has(version));
    for (const version of copies.toSorted(compareText)) {
      const dependents = [...dependentsOf(workspace, name, version)];
      const others = dependents.filter((dependent) => !privateTo.includes(dependent));
      dependents.filter((dependent) => privateTo.includes(dependent)).forEach((dependent) => holders.add(dependent));
      if (others.length > 0) {
        findings.push(depsFinding('deps/private-copy', LOCKFILE, { name, version, dependents: sortedList(others) }));
      }
    }
    for (const dependent of privateTo.filter((candidate) => !holders.has(candidate))) {
      findings.push(depsFinding('deps/private-copy-unused', policy.source, { name, dependent }));
    }
    return findings;
  });
}

function checkPolicyNames(
  policy: DependencyPolicy,
  instances: ReadonlyMap<string, readonly string[]>,
): readonly Diagnostic<DepsCode>[] {
  const names = new Set([...policy.singleInstance, ...Object.keys(policy.singleVersion)]);
  return [...names]
    .filter((name) => !instances.has(name))
    .map((name) => depsFinding('deps/policy-unknown', policy.source, { name }));
}

/** Every dependency finding of a workspace, held to its policy and to the ranges its compatibility tables tested. */
export function checkWorkspace(
  workspace: Workspace,
  policy: DependencyPolicy,
  tested: readonly TestedRanges[] = [],
): readonly Diagnostic<DepsCode>[] {
  const byName = new Map(
    workspace.packages.flatMap((each) => (each.name === null ? [] : [[each.name, each] as const])),
  );
  const instances = instancesByName(workspace);
  return [
    ...checkLockfile(workspace),
    ...checkCatalog(workspace),
    ...workspace.packages.flatMap((each) => checkPackage(each, workspace, byName, policy)),
    ...checkSingleInstances(policy, instances),
    ...checkSingleVersions(workspace, policy, instances),
    ...checkPolicyNames(policy, instances),
    ...checkSiblingVersions(workspace),
    ...checkTestedRanges(workspace, tested),
  ].toSorted(compareDiagnostics);
}
