import { fixtureFactory } from '@huma/fixtures';
import { repoPath } from '@huma/kit/paths';
import type { DependencyPolicy, TestedRanges } from '../check.ts';
import { checkWorkspace } from '../check.ts';
import type { DepsCode } from '../checks.ts';
import type { DependencyKind, Locked, Lockfile, Workspace, WorkspacePackage } from '../workspace.ts';
import { readLockfile } from '../workspace.ts';

const define = fixtureFactory<DepsCode>();

const specifiers = (
  entries: Partial<Record<DependencyKind, Readonly<Record<string, string>>>>,
): WorkspacePackage['specifiers'] => ({
  dependencies: new Map(Object.entries(entries.dependencies ?? {})),
  devDependencies: new Map(Object.entries(entries.devDependencies ?? {})),
  optionalDependencies: new Map(Object.entries(entries.optionalDependencies ?? {})),
  peerDependencies: new Map(Object.entries(entries.peerDependencies ?? {})),
});

const locked = (entries: Readonly<Record<string, Locked>>): ReadonlyMap<string, Locked> =>
  new Map(Object.entries(entries));

const resolved = (entries: Readonly<Record<string, string>>): ReadonlyMap<string, string> =>
  new Map(Object.entries(entries));

/** What a fixture checks: a workspace, the policy it is held to and the ranges its compatibility tables tested. */
type Scenario = Readonly<{ workspace: Workspace; policy: DependencyPolicy; tested: readonly TestedRanges[] }>;

/** A root, a library `tools/kit` and a tool `tools/adr` that depends on it, all in step, under a policy they meet. */
const VALID: Scenario = {
  workspace: {
    packages: [
      {
        directory: '.',
        name: '@huma/workspace',
        specifiers: specifiers({ devDependencies: { typescript: 'catalog:' } }),
        references: ['tools/adr', 'tools/kit'],
      },
      {
        directory: 'tools/kit',
        name: '@huma/kit',
        specifiers: specifiers({ dependencies: { prettier: 'catalog:' } }),
        references: [],
      },
      {
        directory: 'tools/adr',
        name: '@huma/adr',
        specifiers: specifiers({ dependencies: { '@huma/kit': 'workspace:*', 'mdast-util-gfm': 'catalog:' } }),
        references: ['tools/kit'],
      },
    ],
    catalog: new Map([
      ['mdast-util-gfm', '3.1.0'],
      ['prettier', '3.9.6'],
      ['typescript', '6.0.3'],
    ]),
    lockfile: {
      version: '9.0',
      catalog: locked({
        'mdast-util-gfm': { specifier: '3.1.0', version: '3.1.0' },
        prettier: { specifier: '3.9.6', version: '3.9.6' },
        typescript: { specifier: '6.0.3', version: '6.0.3' },
      }),
      importers: new Map([
        ['.', locked({ typescript: { specifier: 'catalog:', version: '6.0.3' } })],
        ['tools/kit', locked({ prettier: { specifier: 'catalog:', version: '3.9.6' } })],
        [
          'tools/adr',
          locked({
            '@huma/kit': { specifier: 'workspace:*', version: 'link:../kit' },
            'mdast-util-gfm': { specifier: 'catalog:', version: '3.1.0' },
          }),
        ],
      ]),
      peers: new Map([
        ['typescript@6.0.3', new Map()],
        ['prettier@3.9.6', new Map()],
        ['mdast-util-gfm@3.1.0', new Map([['micromark', true]])],
      ]),
      snapshots: new Map([
        ['typescript@6.0.3', resolved({})],
        ['prettier@3.9.6', resolved({})],
        ['mdast-util-gfm@3.1.0', resolved({})],
      ]),
    },
  },
  policy: {
    source: repoPath('tools/governance/src/workspace-manifest.ts'),
    roots: { packages: ['packages'], tools: ['packages', 'tools'] },
    singleInstance: ['prettier'],
    singleVersion: { typescript: [] },
  },
  tested: [],
};

type Change = (scenario: Scenario) => Scenario;

const checked =
  (...changes: readonly Change[]) =>
  async (): Promise<readonly DepsCode[]> => {
    const { workspace, policy, tested } = changes.reduce((scenario, change) => change(scenario), VALID);
    return Promise.resolve(checkWorkspace(workspace, policy, tested).map((finding) => finding.code));
  };

const withWorkspace =
  (change: (workspace: Workspace) => Workspace): Change =>
  (scenario) => ({ ...scenario, workspace: change(scenario.workspace) });

const withPolicy =
  (change: Partial<DependencyPolicy>): Change =>
  (scenario) => ({ ...scenario, policy: { ...scenario.policy, ...change } });

const withLockfile = (change: (lockfile: Lockfile) => Lockfile): Change =>
  withWorkspace((workspace) => ({ ...workspace, lockfile: change(workspace.lockfile) }));

const withPackage = (directory: string, change: (each: WorkspacePackage) => WorkspacePackage): Change =>
  withWorkspace((workspace) => ({
    ...workspace,
    packages: workspace.packages.map((each) => (each.directory === directory ? change(each) : each)),
  }));

const withImporter = (directory: string, entries: Readonly<Record<string, Locked>>): Change =>
  withLockfile((lockfile) => ({
    ...lockfile,
    importers: new Map([
      ...lockfile.importers,
      [directory, new Map([...(lockfile.importers.get(directory) ?? []), ...Object.entries(entries)])],
    ]),
  }));

/** A new package of the workspace, resolved in the lockfile with the entries given. */
const withNewPackage = (each: WorkspacePackage, entries: Readonly<Record<string, Locked>>): Change => {
  const added = withWorkspace((workspace) => ({ ...workspace, packages: [...workspace.packages, each] }));
  return (scenario) => withImporter(each.directory, entries)(added(scenario));
};

const withSnapshots = (entries: Readonly<Record<string, Readonly<Record<string, string>>>>): Change =>
  withLockfile((lockfile) => ({
    ...lockfile,
    snapshots: new Map([
      ...lockfile.snapshots,
      ...Object.entries(entries).map(([key, dependencies]) => [key, resolved(dependencies)] as const),
    ]),
  }));

/** `tools/kit` held to a table that tested `prettier` in `range`. */
const withPrettierTested =
  (range: string): Change =>
  (scenario) => ({
    ...scenario,
    tested: [{ importer: 'tools/kit', source: 'kit-sdk 1.0.0', ranges: new Map([['prettier', range]]) }],
  });

/** `tools/adr` also declares `micromark` 4.0.2, while the `mdast-util-gfm` it declares loads 4.0.1. */
const MICROMARK_SIBLING: readonly Change[] = [
  withPackage('tools/adr', (each) => ({
    ...each,
    specifiers: specifiers({
      dependencies: { '@huma/kit': 'workspace:*', 'mdast-util-gfm': 'catalog:', micromark: 'catalog:' },
    }),
  })),
  withWorkspace((workspace) => ({ ...workspace, catalog: new Map([...workspace.catalog, ['micromark', '4.0.2']]) })),
  withLockfile((lockfile) => ({
    ...lockfile,
    catalog: new Map([...lockfile.catalog, ['micromark', { specifier: '4.0.2', version: '4.0.2' }]]),
    peers: new Map([...lockfile.peers, ['micromark@4.0.2', new Map()]]),
  })),
  withImporter('tools/adr', { micromark: { specifier: 'catalog:', version: '4.0.2' } }),
  withSnapshots({ 'micromark@4.0.1': {}, 'micromark@4.0.2': {}, 'mdast-util-gfm@3.1.0': { micromark: '4.0.1' } }),
];

/** A tool whose own dependency resolved another `typescript`, as a transitive dependency would. */
const TYPESCRIPT_COPY = withSnapshots({
  'typescript@5.9.3': {},
  '@feature-sliced/filesystem@3.1.1': { typescript: '5.9.3' },
});

/**
 * A real lockfile, written as pnpm 11 writes it: `vitest` resolved twice, once per set of peers, and a required peer
 * `vite` that its importer does not declare.
 */
const LOCKFILE_TEXT = `lockfileVersion: '9.0'
catalogs:
  default:
    vitest:
      specifier: 5.0.0
      version: 5.0.0
importers:
  .:
    devDependencies:
      vitest:
        specifier: 'catalog:'
        version: 5.0.0(vite@8.3.0)
packages:
  vite@8.3.0:
    resolution: {integrity: sha512-x}
  vitest@5.0.0:
    resolution: {integrity: sha512-y}
    peerDependencies:
      vite: ^8.0.0
      jsdom: '*'
    peerDependenciesMeta:
      jsdom:
        optional: true
snapshots:
  vite@8.3.0: {}
  vitest@5.0.0(vite@8.3.0):
    dependencies:
      vite: 8.3.0
  vitest@5.0.0(jsdom@27.0.0)(vite@8.3.0):
    dependencies:
      vite: 8.3.0
    optionalDependencies:
      jsdom: 27.0.0
`;

/** The workspace of `LOCKFILE_TEXT`: a root declaring `vitest` from the catalog. */
const withLockfileText = (policy: Partial<DependencyPolicy>): Change => {
  const read: Change = (scenario) => ({
    ...scenario,
    workspace: {
      packages: [
        {
          directory: '.',
          name: '@huma/workspace',
          specifiers: specifiers({ devDependencies: { vitest: 'catalog:' } }),
          references: null,
        },
      ],
      catalog: new Map([['vitest', '5.0.0']]),
      lockfile: readLockfile(LOCKFILE_TEXT),
    },
  });
  return (scenario) => withPolicy({ singleInstance: [], singleVersion: {}, ...policy })(read(scenario));
};

export const DEPS_FIXTURES = [
  define('deps/valid', 'un workspace dont manifestes, références, catalog et lockfile concordent', [], checked()),
  define(
    'deps/lockfile-version',
    'un lockfile d’un autre format',
    ['deps/lockfile-version'],
    checked(withLockfile((lockfile) => ({ ...lockfile, version: '6.0' }))),
  ),
  define(
    'deps/importer-missing',
    'un paquet absent du lockfile',
    ['deps/importer-missing'],
    checked(
      withLockfile((lockfile) => ({
        ...lockfile,
        importers: new Map([...lockfile.importers].filter(([key]) => key !== 'tools/kit')),
      })),
    ),
  ),
  define(
    'deps/importer-unknown',
    'un lockfile qui résout un paquet disparu',
    ['deps/importer-unknown'],
    checked(withImporter('tools/ancien', {})),
  ),
  define(
    'deps/importer-stale',
    'un manifeste passé au catalog sans pnpm install',
    ['deps/importer-stale'],
    checked(withImporter('tools/kit', { prettier: { specifier: '3.9.6', version: '3.9.6' } })),
  ),
  define(
    'deps/catalog-range',
    'une plage dans le catalog',
    ['deps/catalog-range', 'deps/catalog-stale'],
    checked(
      withWorkspace((workspace) => ({
        ...workspace,
        catalog: new Map([...workspace.catalog, ['prettier', '^3.9.6']]),
      })),
    ),
  ),
  define(
    'deps/catalog-stale',
    'un catalog modifié sans pnpm install',
    ['deps/catalog-stale'],
    checked(
      withWorkspace((workspace) => ({ ...workspace, catalog: new Map([...workspace.catalog, ['prettier', '3.9.7']]) })),
    ),
  ),
  define(
    'deps/catalog-unused',
    'une entrée du catalog que personne ne déclare',
    ['deps/catalog-unused'],
    checked(
      withWorkspace((workspace) => ({ ...workspace, catalog: new Map([...workspace.catalog, ['zod', '4.5.4']]) })),
    ),
  ),
  define(
    'deps/catalog-missing',
    'une dépendance en catalog: qu’aucune entrée du catalog ne nomme',
    ['deps/catalog-missing'],
    checked(
      withPackage('tools/kit', (each) => ({
        ...each,
        specifiers: specifiers({ dependencies: { prettier: 'catalog:', 'left-pad': 'catalog:' } }),
      })),
    ),
  ),
  define(
    'deps/importer-extra',
    'un lockfile qui garde une dépendance retirée du manifeste',
    ['deps/importer-extra'],
    checked(withImporter('tools/kit', { 'left-pad': { specifier: 'catalog:', version: '1.3.0' } })),
  ),
  define(
    'deps/valid-runtime',
    'le runtime que pnpm gère par devEngines n’est pas une dépendance de trop',
    [],
    checked(withImporter('.', { node: { specifier: 'runtime:24.17.0', version: 'runtime:24.17.0' } })),
  ),
  define(
    'deps/specifier-form',
    'une dépendance du workspace déclarée par version',
    ['deps/specifier-form', 'deps/importer-stale'],
    checked(
      withPackage('tools/adr', (each) => ({
        ...each,
        specifiers: specifiers({ dependencies: { '@huma/kit': '0.0.0', 'mdast-util-gfm': 'catalog:' } }),
      })),
    ),
  ),
  define(
    'deps/reference-missing',
    'une dépendance workspace sans référence TypeScript',
    ['deps/reference-missing'],
    checked(withPackage('tools/adr', (each) => ({ ...each, references: [] }))),
  ),
  define(
    'deps/reference-undeclared',
    'une référence TypeScript vers un paquet non déclaré',
    ['deps/reference-undeclared'],
    checked(withPackage('tools/kit', (each) => ({ ...each, references: ['tools/adr'] }))),
  ),
  define(
    'deps/peer-undeclared',
    'un pair obligatoire installé en silence, lu dans un vrai lockfile',
    ['deps/peer-undeclared'],
    checked(withLockfileText({})),
  ),
  define(
    'deps/root-dependency',
    'un paquet de packages/ qui dépend d’un outil de tools/',
    ['deps/root-dependency'],
    checked(
      withNewPackage(
        {
          directory: 'packages/config',
          name: '@huma/config',
          specifiers: specifiers({ dependencies: { '@huma/kit': 'workspace:*' } }),
          references: null,
        },
        { '@huma/kit': { specifier: 'workspace:*', version: 'link:../../tools/kit' } },
      ),
    ),
  ),
  define(
    'deps/root-unknown',
    'un paquet rangé hors des dossiers de la politique',
    ['deps/root-unknown'],
    checked(
      withNewPackage(
        { directory: 'scripts/release', name: '@huma/release', specifiers: specifiers({}), references: null },
        {},
      ),
    ),
  ),
  define(
    'deps/single-instance',
    'un paquet à instance unique résolu deux fois selon ses pairs, lu dans un vrai lockfile',
    ['deps/single-instance', 'deps/peer-undeclared'],
    checked(withLockfileText({ singleInstance: ['vitest'] })),
  ),
  define(
    'deps/single-version',
    'deux paquets du workspace qui résolvent deux versions de typescript',
    ['deps/single-version'],
    checked(
      withPackage('tools/kit', (each) => ({
        ...each,
        specifiers: specifiers({ dependencies: { prettier: 'catalog:' }, devDependencies: { typescript: 'catalog:' } }),
      })),
      withImporter('tools/kit', { typescript: { specifier: 'catalog:', version: '5.9.3' } }),
      withSnapshots({ 'typescript@5.9.3': {} }),
    ),
  ),
  define(
    'deps/private-copy',
    'une dépendance transitive qui charge sa propre version de typescript',
    ['deps/private-copy'],
    checked(TYPESCRIPT_COPY),
  ),
  define(
    'deps/private-copy-allowed',
    'la même copie, permise à son seul dépendant par la politique',
    [],
    checked(TYPESCRIPT_COPY, withPolicy({ singleVersion: { typescript: ['@feature-sliced/filesystem'] } })),
  ),
  define(
    'deps/private-copy-unused',
    'une copie privée permise que plus aucun dépendant ne charge',
    ['deps/private-copy-unused'],
    checked(withPolicy({ singleVersion: { typescript: ['@feature-sliced/filesystem'] } })),
  ),
  define(
    'deps/untested-version',
    'une dépendance hors de la plage que la table de compatibilité de son paquet a testée',
    ['deps/untested-version'],
    checked(withPrettierTested('~3.8.0')),
  ),
  define('deps/tested-version', 'la même dépendance, dans la plage testée', [], checked(withPrettierTested('~3.9.0'))),
  define(
    'deps/sibling-version',
    'un paquet qui déclare une autre version de micromark que celle que charge sa dépendance mdast-util-gfm',
    ['deps/sibling-version'],
    checked(...MICROMARK_SIBLING),
  ),
  define(
    'deps/policy-unknown',
    'une politique qui nomme un paquet mal orthographié',
    ['deps/policy-unknown'],
    checked(withPolicy({ singleInstance: ['prettier', 'pretier'] })),
  ),
] as const;
