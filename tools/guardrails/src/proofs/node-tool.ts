import type { FileTree, Fixture } from '@huma/fixtures';
import { fixtureFactory, IN_PROCESS } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { lintTree } from '../lint-tree.ts';
import { ALL_POLICIES, mutantsOf } from '../mutation.ts';

const define = fixtureFactory<PolicyId>(IN_PROCESS);

/** A Node tool of the workspace, whose `src/probe.ts` holds the code under test beside a helper module. */
export const nodeTool = (probe: string): FileTree => ({
  'tools/probe/package.json': '{ "name": "@huma/probe", "private": true, "type": "module" }\n',
  'tools/probe/tsconfig.json': '{ "extends": "@huma/tsconfig/node.json", "include": ["src"] }\n',
  'tools/probe/src/helper.ts': 'export const helper = 1;\n',
  'tools/probe/src/probe.ts': probe,
});

/** A probe that declares `name.only` as a test runner would, then calls it. */
const focused = (name: string): string => `const ${name} = {
  only: (title: string, body: () => void): string => {
    body();
    return title;
  },
};

export const probe = ${name}.only('probe', () => undefined);
`;

/** The fixtures of the policies of Node code, linted with the policies of `enabled` only. */
const nodeToolFixtures = (enabled: ReadonlySet<PolicyId>) => {
  const linted = (probe: string) => async (): Promise<readonly PolicyId[]> => lintTree(nodeTool(probe), enabled);
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
    define('guardrail/test-describe-only', 'un describe focalisé', ['test/describe-only'], linted(focused('describe'))),
    define('guardrail/test-it-only', 'un it focalisé', ['test/it-only'], linted(focused('it'))),
    define('guardrail/test-test-only', 'un test focalisé', ['test/test-only'], linted(focused('test'))),
    define(
      'guardrail/spelling-unknown',
      'un identifiant qui n’est pas un mot anglais',
      ['spelling/unknown'],
      linted('export const qwxzvtrp = 1;\n'),
    ),
  ] as const;
};

export const NODE_TOOL_FIXTURES = nodeToolFixtures(ALL_POLICIES);

export const nodeToolMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] =>
  mutantsOf(nodeToolFixtures, policy);
