import { fixtureFactory } from '@huma/fixtures';
import type { DependencyPolicy } from '../check.ts';
import { checkWorkspace } from '../check.ts';
import type { DepsCode } from '../checks.ts';
import type { DependencyKind, Locked, Lockfile, Workspace, WorkspacePackage } from '../workspace.ts';
import { readLockfile } from '../workspace.ts';

const define = fixtureFactory<DepsCode>();

const POLICY: DependencyPolicy = { singleVersion: ['typescript'] };

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

/** A root, a library `tools/kit` and a tool `tools/adr` that depends on it, all in step. */
const VALID: Workspace = {
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
  },
};

type Change = (workspace: Workspace) => Workspace;

const checked =
  (...changes: readonly Change[]) =>
  async (): Promise<readonly DepsCode[]> =>
    Promise.resolve(
      checkWorkspace(
        changes.reduce((workspace, change) => change(workspace), VALID),
        POLICY,
      ).map((finding) => finding.code),
    );

const withLockfile =
  (change: (lockfile: Lockfile) => Lockfile): Change =>
  (workspace) => ({ ...workspace, lockfile: change(workspace.lockfile) });

const withPackage =
  (directory: string, change: (each: WorkspacePackage) => WorkspacePackage): Change =>
  (workspace) => ({
    ...workspace,
    packages: workspace.packages.map((each) => (each.directory === directory ? change(each) : each)),
  });

const withImporter = (directory: string, entries: Readonly<Record<string, Locked>>): Change =>
  withLockfile((lockfile) => ({
    ...lockfile,
    importers: new Map([
      ...lockfile.importers,
      [directory, new Map([...(lockfile.importers.get(directory) ?? []), ...Object.entries(entries)])],
    ]),
  }));

const LOCKFILE_TEXT = `lockfileVersion: '9.0'
catalogs:
  default:
    prettier:
      specifier: 3.9.6
      version: 3.9.6
importers:
  .:
    devDependencies:
      vitest:
        specifier: 'catalog:'
        version: 5.0.0(vite@8.3.0)
packages:
  vitest@5.0.0:
    resolution: {integrity: sha512-x}
    peerDependencies:
      vite: ^8.0.0
      jsdom: '*'
    peerDependenciesMeta:
      jsdom:
        optional: true
`;

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
    checked((workspace) => ({ ...workspace, catalog: new Map([...workspace.catalog, ['prettier', '^3.9.6']]) })),
  ),
  define(
    'deps/catalog-stale',
    'un catalog modifié sans pnpm install',
    ['deps/catalog-stale'],
    checked((workspace) => ({ ...workspace, catalog: new Map([...workspace.catalog, ['prettier', '3.9.7']]) })),
  ),
  define(
    'deps/catalog-unused',
    'une entrée du catalog que personne ne déclare',
    ['deps/catalog-unused'],
    checked((workspace) => ({ ...workspace, catalog: new Map([...workspace.catalog, ['zod', '4.5.4']]) })),
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
    'deps/single-version',
    'deux versions de typescript résolues',
    ['deps/single-version'],
    checked(
      withLockfile((lockfile) => ({
        ...lockfile,
        peers: new Map([...lockfile.peers, ['typescript@5.9.3', new Map()]]),
      })),
    ),
  ),
  define(
    'deps/peer-undeclared',
    'un pair obligatoire installé en silence, lu dans un vrai lockfile',
    ['deps/peer-undeclared'],
    checked(
      withLockfile(() => readLockfile(LOCKFILE_TEXT)),
      (workspace) => ({
        ...workspace,
        packages: [
          {
            directory: '.',
            name: '@huma/workspace',
            specifiers: specifiers({ devDependencies: { vitest: 'catalog:' } }),
            references: null,
          },
        ],
        catalog: new Map([['vitest', '5.0.0']]),
      }),
    ),
  ),
] as const;
