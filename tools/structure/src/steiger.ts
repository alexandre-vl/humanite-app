import { join } from 'node:path';
import fsd from '@feature-sliced/steiger-plugin';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { repoPath, toRepoPath } from '@huma/kit/paths';
import { isOneOf } from '@huma/kit/records';
import { isList, isRecord } from '@huma/unknown';
import { linter, processConfiguration } from 'steiger';
import type { StructureCode } from './checks.ts';
import { STRUCTURE_CHECKS, structureFinding } from './checks.ts';

/**
 * Every rule of Steiger's Feature-Sliced plugin, on or off. Steiger judges what no other tool owns; boundaries owns
 * the places, their entries and their imports, so the rules that repeat it stay off and a finding has one owner.
 */
const STEIGER_RULES = {
  'fsd/ambiguous-slice-names': 'error',
  'fsd/excessive-slicing': 'error',
  'fsd/import-locality': 'error',
  'fsd/inconsistent-naming': 'error',
  'fsd/insignificant-slice': 'error',
  'fsd/no-reserved-folder-names': 'error',
  'fsd/repetitive-naming': 'error',
  'fsd/shared-lib-grouping': 'error',
  // Imports and public entries: boundaries, from the places of @huma/architecture.
  'fsd/forbidden-imports': 'off',
  'fsd/no-cross-imports': 'off',
  'fsd/no-higher-level-imports': 'off',
  'fsd/no-layer-public-api': 'off',
  'fsd/no-public-api-sidestep': 'off',
  'fsd/public-api': 'off',
  // Layers and segments: boundaries refuses a file in no place.
  'fsd/no-processes': 'off',
  'fsd/no-segmentless-slices': 'off',
  'fsd/no-segments-on-sliced-layers': 'off',
  'fsd/no-ui-in-app': 'off',
  'fsd/segments-by-purpose': 'off',
  // Reads the `_app` layer, which Expo Router imposes, as a typo of `app` (journal 0a, correction 9).
  'fsd/typo-in-layer-name': 'off',
} as const;

/** A plugin as Steiger's configuration takes it. */
type SteigerPlugin = Extract<
  Parameters<typeof processConfiguration>[0][number],
  Readonly<{ ruleDefinitions: unknown }>
>;

const isSteigerPlugin = (value: unknown): value is SteigerPlugin =>
  isRecord(value) && isList(value['ruleDefinitions']) && isRecord(value['meta']);

/**
 * The Feature-Sliced plugin, checked on loading: its declarations import a toolkit it bundles instead of depending on,
 * so TypeScript cannot read its types.
 */
function featureSlicedPlugin(): SteigerPlugin {
  const loaded: unknown = Reflect.get(fsd, 'plugin');
  if (!isSteigerPlugin(loaded)) {
    throw new Error('le plugin Feature-Sliced de Steiger n’a plus la forme attendue');
  }
  return loaded;
}

/** The names of the rules the plugin defines, read from the plugin itself. */
function pluginRuleNames(): readonly string[] {
  return featureSlicedPlugin().ruleDefinitions.map((definition: unknown) => {
    const name = isRecord(definition) ? definition['name'] : null;
    if (typeof name !== 'string') {
      throw new Error('règle Steiger sans nom');
    }
    return name;
  });
}

/** The rules of the plugin that `STEIGER_RULES` does not classify, or classifies without the plugin having them. */
export function unclassifiedSteigerRules(): Readonly<{ missing: readonly string[]; unknown: readonly string[] }> {
  const names = pluginRuleNames();
  const classified = Object.keys(STEIGER_RULES);
  return {
    missing: names.filter((name) => !classified.includes(name)),
    unknown: classified.filter((name) => !names.includes(name)),
  };
}

/** The codes this package reports itself, from the imports and the files of the app, rather than through Steiger. */
const OWN_CODES = [
  'structure/cycle',
  'structure/source-variant',
  'structure/service-corpus',
] as const satisfies readonly StructureCode[];

/** The codes of the Steiger rules, which carry Steiger's own text. */
type SteigerCode = Exclude<StructureCode, (typeof OWN_CODES)[number]>;

const STEIGER_CODES: readonly SteigerCode[] = STRUCTURE_CHECKS.codes.filter(
  (code): code is SteigerCode => !isOneOf(OWN_CODES, code),
);

const codeOf = (rule: string): SteigerCode | null => {
  const code = `structure/${rule.replace(/^fsd\//u, '')}`;
  return isOneOf(STEIGER_CODES, code) ? code : null;
};

/**
 * Runs Steiger on the layers of the app at `appRoot`, relative to `root`, through its API: its configuration is only
 * the rules above, never a file it would find on its own. Steiger keeps one configuration per process, so runs are
 * sequential.
 */
export async function steigerFindings(root: string, appRoot: string): Promise<readonly Diagnostic<StructureCode>[]> {
  processConfiguration([featureSlicedPlugin(), { rules: STEIGER_RULES }], join(root, appRoot));
  const reported = await linter.run(join(root, appRoot, 'src'));
  return reported.map((diagnostic) => {
    const code = codeOf(diagnostic.ruleName);
    if (code === null) {
      throw new Error(`règle Steiger hors du tableau : ${diagnostic.ruleName}`);
    }
    const path = toRepoPath(root, diagnostic.location.path) ?? repoPath(appRoot);
    const position = { line: diagnostic.location.line ?? 1, column: diagnostic.location.column ?? 1 };
    return structureFinding(code, path, { text: diagnostic.message }, position);
  });
}
