import js from '@eslint/js';
import type { HermesGap } from '@huma/architecture';
import {
  CONFINED_MODULES,
  ENTRY_FILES,
  HERMES_FILES,
  HERMES_GAP_NAMES,
  HERMES_GAPS,
  ROUTE_FILES,
} from '@huma/architecture';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { boundariesConfig } from './boundaries.ts';
import { namingConfig } from './naming.ts';
import type { PolicyId } from './policies.ts';
import { hermesPolicy, modulePolicy, POLICY_IDS, policyMessage } from './policies.ts';
import { reactConfig } from './react.ts';

export type WorkspaceConfigOptions = Readonly<{
  /** The workspace root, which holds the solution `tsconfig.json` that references every TypeScript project. */
  tsconfigRootDir: string;
  /** The policies to enforce, all by default: a guardrail leaves one out to prove its fixtures then fail. */
  policies?: ReadonlySet<PolicyId>;
}>;

const TYPESCRIPT_FILES = ['**/*.ts', '**/*.tsx'];

const JAVASCRIPT_FILES = ['**/*.js', '**/*.mjs', '**/*.cjs'];

const RELATIVE_JS = String.raw`/^\.{1,2}\/.*\.js$/`;

type RuleEntry = Linter.RuleEntry;

/** A restriction of `no-restricted-syntax`: the policy it enforces and the AST selector it refuses. */
type SyntaxRestriction = Readonly<{ policy: PolicyId; selector: string }>;

/** A restriction of `no-restricted-properties`: the policy it enforces and the property it refuses, on any object when `null`. */
type PropertyRestriction = Readonly<{ policy: PolicyId; object: string | null; property: string }>;

/** A restriction of `no-restricted-globals`: the policy it enforces and the global it refuses. */
type GlobalRestriction = Readonly<{ policy: PolicyId; name: string }>;

/** An option of `@typescript-eslint/naming-convention`. */
type NamingRule = Readonly<Record<string, unknown>>;

const CORE_SYNTAX: readonly SyntaxRestriction[] = [{ policy: 'export/all', selector: 'ExportAllDeclaration' }];

const NODE_SYNTAX: readonly SyntaxRestriction[] = [
  { policy: 'node/decorator', selector: 'Decorator' },
  { policy: 'node/accessor', selector: 'AccessorProperty, TSAbstractAccessorProperty' },
  { policy: 'node/import-js', selector: `ImportDeclaration[source.value=${RELATIVE_JS}]` },
  { policy: 'node/export-js', selector: `ExportNamedDeclaration[source.value=${RELATIVE_JS}]` },
  { policy: 'node/dynamic-import-js', selector: `ImportExpression[source.value=${RELATIVE_JS}]` },
];

const FOCUSED_TESTS: readonly PropertyRestriction[] = [
  { policy: 'test/describe-only', object: 'describe', property: 'only' },
  { policy: 'test/it-only', object: 'it', property: 'only' },
  { policy: 'test/test-only', object: 'test', property: 'only' },
];

/** A route re-exports its page and its error boundary: Expo Router treats every file of the directory as a route. */
const ROUTE_SYNTAX: readonly SyntaxRestriction[] = [
  { policy: 'route/re-export', selector: 'Program > :not(ExportNamedDeclaration[source])' },
  { policy: 'route/error-boundary', selector: 'Program:not(:has(ExportSpecifier[exported.name="ErrorBoundary"]))' },
];

const ENTRY_SYNTAX: readonly SyntaxRestriction[] = [
  { policy: 'entry/re-export', selector: 'Program > :not(ExportNamedDeclaration[source])' },
];

const NODE_PROPERTIES: readonly PropertyRestriction[] = [
  { policy: 'node/process-exit', object: 'process', property: 'exit' },
];

const NAMING_BASE: readonly NamingRule[] = [
  { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
  { selector: 'typeLike', format: ['PascalCase'] },
  { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
  { selector: 'import', format: ['camelCase', 'PascalCase'] },
];

/** Constants in Node code: values, or tables in upper case. */
const NODE_NAMING: readonly NamingRule[] = [
  ...NAMING_BASE,
  { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'UPPER_CASE'] },
];

/** React components are functions, and constants holding them, named in PascalCase. */
const HERMES_NAMING: readonly NamingRule[] = [
  ...NAMING_BASE,
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
];

/** The restrictions of the enabled policies, as the options of `no-restricted-syntax` and `no-restricted-properties`. */
const restrictedSyntax = (
  syntax: readonly SyntaxRestriction[],
  enabled: ReadonlySet<PolicyId>,
): readonly Readonly<{ selector: string; message: string }>[] =>
  syntax
    .filter(({ policy }) => enabled.has(policy))
    .map(({ policy, selector }) => ({ selector, message: policyMessage(policy) }));

const restrictedProperties = (
  properties: readonly PropertyRestriction[],
  enabled: ReadonlySet<PolicyId>,
): readonly Readonly<{ object?: string; property: string; message: string }>[] =>
  properties
    .filter(({ policy }) => enabled.has(policy))
    .map(({ policy, object, property }) => ({
      ...(object === null ? {} : { object }),
      property,
      message: policyMessage(policy),
    }));

const restrictedGlobals = (
  globals: readonly GlobalRestriction[],
  enabled: ReadonlySet<PolicyId>,
): readonly Readonly<{ name: string; message: string }>[] =>
  globals
    .filter(({ policy }) => enabled.has(policy))
    .map(({ policy, name }) => ({ name, message: policyMessage(policy) }));

/** The restrictions of a kind of file, on top of the core ones. */
type Runtime = Readonly<{
  syntax: readonly SyntaxRestriction[];
  properties: readonly PropertyRestriction[];
  globals: readonly GlobalRestriction[];
  naming: readonly NamingRule[];
}>;

const NODE: Runtime = { syntax: NODE_SYNTAX, properties: NODE_PROPERTIES, globals: [], naming: NODE_NAMING };

/** The restrictions that refuse a Hermes gap, however the code reaches it: directly or through `globalThis`. */
function gapRestrictions(name: (typeof HERMES_GAP_NAMES)[number]): Pick<Runtime, 'syntax' | 'properties' | 'globals'> {
  const gap: HermesGap = HERMES_GAPS[name];
  const policy = hermesPolicy(name);
  switch (gap.kind) {
    case 'property':
      return {
        syntax:
          gap.object === null
            ? []
            : [
                {
                  policy,
                  selector: `MemberExpression[object.object.name='globalThis'][object.property.name='${gap.object}'][property.name='${gap.property}']`,
                },
              ],
        properties: [{ policy, object: gap.object, property: gap.property }],
        globals: [],
      };
    case 'global':
      return {
        syntax: [{ policy, selector: `MemberExpression[object.name='globalThis'][property.name='${gap.name}']` }],
        properties: [],
        globals: [{ policy, name: gap.name }],
      };
    case 'regex-flag':
      return {
        syntax: [
          { policy, selector: `Literal[regex.flags=/${gap.flag}/]` },
          { policy, selector: `NewExpression[callee.name='RegExp'] > Literal:nth-child(2)[value=/${gap.flag}/]` },
          { policy, selector: `CallExpression[callee.name='RegExp'] > Literal:nth-child(2)[value=/${gap.flag}/]` },
        ],
        properties: [],
        globals: [],
      };
  }
}

const HERMES_GAP_RESTRICTIONS = HERMES_GAP_NAMES.map(gapRestrictions);

/**
 * A namespace import of a confined package takes every name at once: boundaries only judges named imports, so the
 * policy of the package also refuses this form, in every place.
 */
const CONFINED_NAMESPACES: readonly SyntaxRestriction[] = CONFINED_MODULES.map((name) => ({
  policy: modulePolicy(name),
  selector: `ImportDeclaration[source.value='${name}'] > ImportNamespaceSpecifier`,
}));

const HERMES: Runtime = {
  syntax: [...CONFINED_NAMESPACES, ...HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.syntax)],
  properties: HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.properties),
  globals: HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.globals),
  naming: HERMES_NAMING,
};

/** The restrictions of `runtime` for files of a narrower role, a route or a public entry. */
const narrowed = (runtime: Runtime, syntax: readonly SyntaxRestriction[]): Runtime => ({
  ...runtime,
  syntax: [...runtime.syntax, ...syntax],
});

/**
 * The rules whose options a runtime extends. ESLint replaces the options of a rule set again by a later block, so each
 * runtime gets the complete lists instead of adding to the core ones.
 */
const restrictions = (runtime: Runtime, enabled: ReadonlySet<PolicyId>): Readonly<Record<string, RuleEntry>> => ({
  'no-restricted-syntax': ['error', ...restrictedSyntax([...CORE_SYNTAX, ...runtime.syntax], enabled)],
  'no-restricted-properties': ['error', ...restrictedProperties([...FOCUSED_TESTS, ...runtime.properties], enabled)],
  'no-restricted-globals': ['error', ...restrictedGlobals(runtime.globals, enabled)],
  '@typescript-eslint/naming-convention': ['error', ...runtime.naming],
});

/** Rules that need no type information, for every file ESLint reads. */
const untypedRules = (enabled: ReadonlySet<PolicyId>): Readonly<Record<string, RuleEntry>> => ({
  curly: ['error', 'all'],
  eqeqeq: 'error',
  'no-console': 'error',
  'no-implicit-coercion': 'error',
  'no-param-reassign': 'error',
  'no-restricted-syntax': ['error', ...restrictedSyntax(CORE_SYNTAX, enabled)],
  'no-warning-comments': 'error',
  'object-shorthand': 'error',
  'prefer-template': 'error',
});

const TYPESCRIPT_RULES: Readonly<Record<string, RuleEntry>> = {
  '@typescript-eslint/ban-ts-comment': [
    'error',
    {
      'ts-check': false,
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true,
      minimumDescriptionLength: 10,
    },
  ],
  '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/method-signature-style': ['error', 'property'],
  '@typescript-eslint/no-import-type-side-effects': 'error',
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/promise-function-async': 'error',
  '@typescript-eslint/require-array-sort-compare': 'error',
  '@typescript-eslint/strict-boolean-expressions': [
    'error',
    { allowNullableObject: false, allowNumber: false, allowString: false },
  ],
  '@typescript-eslint/switch-exhaustiveness-check': [
    'error',
    {
      allowDefaultCaseForExhaustiveSwitch: false,
      considerDefaultExhaustiveForUnions: false,
      requireDefaultForNonUnion: true,
    },
  ],
};

/**
 * Lint rules of the workspace: every TypeScript file gets the strict typed rules, then the restrictions of the runtime
 * that executes it, Node or Hermes; JavaScript configuration files get the rules that need no types.
 */
export function defineWorkspaceConfig({
  tsconfigRootDir,
  policies = new Set(POLICY_IDS),
}: WorkspaceConfigOptions): Linter.Config[] {
  return defineConfig(
    globalIgnores(['**/node_modules/']),
    {
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: 'error',
        reportUnusedInlineConfigs: 'error',
      },
    },
    {
      files: JAVASCRIPT_FILES,
      extends: [js.configs.recommended],
      rules: untypedRules(policies),
    },
    {
      files: TYPESCRIPT_FILES,
      extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      rules: { ...untypedRules(policies), ...TYPESCRIPT_RULES },
    },
    {
      files: TYPESCRIPT_FILES,
      ignores: [...HERMES_FILES],
      rules: restrictions(NODE, policies),
    },
    {
      files: [...HERMES_FILES],
      rules: restrictions(HERMES, policies),
    },
    {
      files: [...ROUTE_FILES],
      rules: restrictions(narrowed(HERMES, ROUTE_SYNTAX), policies),
    },
    {
      files: [...ENTRY_FILES],
      rules: restrictions(narrowed(HERMES, ENTRY_SYNTAX), policies),
    },
    ...namingConfig([...JAVASCRIPT_FILES, ...TYPESCRIPT_FILES], policies),
    reactConfig(tsconfigRootDir),
    boundariesConfig(tsconfigRootDir, policies),
  );
}
