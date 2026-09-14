import type { Fixture, FileTree } from '@huma/fixtures';
import { fixtureFactory } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { POLICY_IDS } from '@huma/eslint-config/policies';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { lintPolicies } from '../eslint.ts';
import { workspaceCopy } from '../workspace-copy.ts';

const define = fixtureFactory<PolicyId>();

/** A Node tool of the workspace, whose `src/probe.ts` holds the code under test beside a helper module. */
const nodeTool = (probe: string): FileTree => ({
  'tools/probe/package.json': '{ "name": "@huma/probe", "private": true, "type": "module" }\n',
  'tools/probe/tsconfig.json': '{ "extends": "@huma/tsconfig/node.json", "include": ["src"] }\n',
  'tools/probe/src/helper.ts': 'export const helper = 1;\n',
  'tools/probe/src/probe.ts': probe,
});

/**
 * The fixtures of the lint policies, linted with the policies of `enabled` only: all of them prove each policy fires,
 * all but one prove that the fixtures of the one left out then fail.
 */
const policyFixtures = (enabled: ReadonlySet<PolicyId>) => {
  const linted = (probe: string) => async (): Promise<readonly PolicyId[]> => {
    await using copy = await workspaceCopy(await findWorkspaceRoot(import.meta.dirname), nodeTool(probe));
    return await lintPolicies(copy.root, ['tools/probe/src/probe.ts', 'tools/probe/src/helper.ts'], enabled);
  };
  return [
    define(
      'guardrail/clean-node-tool',
      'un outil Node qui respecte chaque politique',
      [],
      linted('export const probe = 1;\n'),
    ),
    define('guardrail/export-all', 'un export *', ['export/all'], linted("export * from './helper.ts';\n")),
    define(
      'guardrail/node-decorator',
      'un décorateur, que Node ne sait pas exécuter',
      ['node/decorator'],
      linted(`const logged = <Method>(method: Method, context: ClassMethodDecoratorContext): Method => {
  context.addInitializer(() => undefined);
  return method;
};

export class Probe {
  @logged
  run(): number {
    return 1;
  }
}
`),
    ),
    define(
      'guardrail/node-accessor',
      'un accesseur accessor, que Node ne sait pas exécuter',
      ['node/accessor'],
      linted('export class Probe {\n  accessor count = 0;\n}\n'),
    ),
    define(
      'guardrail/node-import-js',
      'un import relatif en .js',
      ['node/import-js'],
      linted("import { helper } from './helper.js';\n\nexport const probe = helper;\n"),
    ),
    define(
      'guardrail/node-export-js',
      'une réexportation relative en .js',
      ['node/export-js'],
      linted("export { helper } from './helper.js';\n"),
    ),
    define(
      'guardrail/node-dynamic-import-js',
      'un import dynamique relatif en .js',
      ['node/dynamic-import-js'],
      linted("export const load = async (): Promise<unknown> => import('./helper.js');\n"),
    ),
    define(
      'guardrail/node-process-exit',
      'un appel à process.exit',
      ['node/process-exit'],
      linted('export const stop = (): never => process.exit(1);\n'),
    ),
    define(
      'guardrail/test-describe-only',
      'un describe focalisé',
      ['test/describe-only'],
      linted(`const describe = {
  only: (name: string, body: () => void): string => {
    body();
    return name;
  },
};

export const probe = describe.only('probe', () => undefined);
`),
    ),
    define(
      'guardrail/test-it-only',
      'un it focalisé',
      ['test/it-only'],
      linted(`const it = {
  only: (name: string, body: () => void): string => {
    body();
    return name;
  },
};

export const probe = it.only('probe', () => undefined);
`),
    ),
    define(
      'guardrail/test-test-only',
      'un test focalisé',
      ['test/test-only'],
      linted(`const test = {
  only: (name: string, body: () => void): string => {
    body();
    return name;
  },
};

export const probe = test.only('probe', () => undefined);
`),
    ),
  ] as const;
};

export const POLICY_FIXTURES = policyFixtures(new Set(POLICY_IDS));

/** The fixtures that expect `policy`, linted with every other policy: each must then miss exactly `policy`. */
export const policyMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] =>
  policyFixtures(new Set(POLICY_IDS.filter((id) => id !== policy))).filter((fixture) =>
    fixture.expected.some((code: PolicyId) => code === policy),
  );
