import type { FileTree, Fixture } from '@huma/fixtures';
import { fixtureFactory, IN_PROCESS } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { lintTree } from '../lint-tree.ts';
import { ALL_POLICIES, mutantsOf } from '../mutation.ts';
import { appTree } from './app-tree.ts';
import { nodeTool } from './node-tool.ts';

const define = fixtureFactory<PolicyId>(IN_PROCESS);

/** A package of the workspace under `packages/`, holding the one source file `path` of `src`. */
const workspacePackage = (name: string, path: string, source: string): FileTree => ({
  [`packages/${name}/package.json`]: `{ "name": "@huma/${name}", "private": true, "type": "module" }\n`,
  [`packages/${name}/tsconfig.json`]: '{ "extends": "@huma/tsconfig/library.json", "include": ["src"] }\n',
  [`packages/${name}/src/${path}`]: source,
});

/** What every copy of `isRecord` wrote before the workspace had one: `typeof`, then `null` remembered by hand. */
const RECORD_BY_HAND =
  "export const isRecord = (value: unknown): boolean => typeof value === 'object' && value !== null;\n";

/** The list check every caller wrote, which narrows to a list of `any`. */
const LIST_BY_HAND = 'export const isList = (value: unknown): boolean => Array.isArray(value);\n';

/** The fixtures of what may ask a value of unknown shape what it is, linted with the policies of `enabled` only. */
const unknownFixtures = (enabled: ReadonlySet<PolicyId>) => {
  const inTool = (probe: string) => async (): Promise<readonly PolicyId[]> => lintTree(nodeTool(probe), enabled);
  const inTree = (tree: FileTree) => async (): Promise<readonly PolicyId[]> => lintTree(tree, enabled);
  const inApp = (source: string) => async (): Promise<readonly PolicyId[]> =>
    lintTree(await appTree({ 'src/pages/home/model/probe.ts': source }), enabled);
  return [
    define(
      'guardrail/unknown-record',
      'un outil qui demande à typeof si une valeur est un objet',
      ['unknown/record'],
      inTool(RECORD_BY_HAND),
    ),
    define(
      'guardrail/unknown-record-reversed',
      'la même question, le mot object écrit à gauche',
      ['unknown/record'],
      inTool("export const isRecord = (value: unknown): boolean => 'object' === typeof value && value !== null;\n"),
    ),
    define(
      'guardrail/unknown-record-switch',
      'la même question posée par un switch sur typeof',
      ['unknown/record'],
      inTool(`export const kindOf = (value: unknown): string => {
  switch (typeof value) {
    case 'object':
      return 'objet';
    case 'bigint':
    case 'boolean':
    case 'function':
    case 'number':
    case 'string':
    case 'symbol':
    case 'undefined':
      return 'autre';
  }
};
`),
    ),
    define(
      'guardrail/unknown-record-app',
      'un écran qui demande à typeof si une valeur est un objet',
      ['unknown/record'],
      inApp(RECORD_BY_HAND),
    ),
    define(
      'guardrail/unknown-list',
      'un outil qui demande à Array.isArray si une valeur est une liste',
      ['unknown/list'],
      inTool(LIST_BY_HAND),
    ),
    define(
      'guardrail/unknown-list-destructured',
      'Array.isArray tiré d’Array par déstructuration',
      ['unknown/list'],
      inTool('export const { isArray } = Array;\n'),
    ),
    define(
      'guardrail/unknown-list-global-this',
      'Array.isArray atteint à travers globalThis',
      ['unknown/list'],
      inTool('export const isList = (value: unknown): boolean => globalThis.Array.isArray(value);\n'),
    ),
    define(
      'guardrail/unknown-list-instanceof',
      'une liste reconnue par instanceof Array',
      ['unknown/list'],
      inTool('export const isList = (value: unknown): boolean => value instanceof Array;\n'),
    ),
    define(
      'guardrail/unknown-list-bundled',
      'un paquet que l’app embarque, qui demande à Array.isArray si une valeur est une liste',
      ['unknown/list'],
      inTree(workspacePackage('contracts', 'probe.ts', LIST_BY_HAND)),
    ),
    define(
      'guardrail/unknown-list-package-test',
      'un test de @huma/unknown qui demande à Array.isArray ce que le paquet sait déjà',
      ['unknown/list'],
      inTree(workspacePackage('unknown', 'unknown.test.ts', LIST_BY_HAND)),
    ),
    define(
      'guardrail/unknown-exempt',
      '@huma/unknown, le seul lieu qui demande à la main ce qu’est une valeur',
      [],
      inTree(
        workspacePackage(
          'unknown',
          'unknown.ts',
          `export const isRecord = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
`,
        ),
      ),
    ),
  ] as const;
};

export const UNKNOWN_FIXTURES = unknownFixtures(ALL_POLICIES);

export const unknownMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] =>
  mutantsOf(unknownFixtures, policy);
