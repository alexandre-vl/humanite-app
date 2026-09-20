import js from '@eslint/js';
import type { HermesGap } from '@huma/architecture';
import {
  BUNDLED_FILES,
  CONFINED_MODULES,
  ENTRY_FILES,
  HERMES_FILES,
  HERMES_GAP_NAMES,
  HERMES_GAPS,
  QUERY_FILES,
  ROUTING_FILES,
  ROUTE_FILES,
  THEME_FILES,
} from '@huma/architecture';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { boundariesConfig } from './boundaries.ts';
import { namingConfig } from './naming.ts';
import type { PolicyId } from './policies.ts';
import { hermesPolicy, modulePolicy, POLICY_IDS, policyMessage } from './policies.ts';
import { queryConfig } from './query.ts';
import { reactConfig } from './react.ts';
import { spellingConfig } from './spelling.ts';

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

/**
 * Styles come from a constructor that turns tokens into a style: an inline style object escapes it, even nested in a
 * style array. Every prop whose name ends in `style` carries one — a native navigator names its own `labelStyle`,
 * `headerStyle`, `contentStyle` — so the rule reads the suffix rather than the one name `style`, which let the tab
 * bar's label colour through.
 */
const STYLE_SYNTAX: readonly SyntaxRestriction[] = [
  { policy: 'style/inline', selector: 'JSXAttribute[name.name=/[Ss]tyle$/] > JSXExpressionContainer ObjectExpression' },
];

/** UI text comes from the dictionary through a DisplayText: raw text written in the JSX, whitespace aside, escapes it. */
const TEXT_SYNTAX: readonly SyntaxRestriction[] = [{ policy: 'text/jsx', selector: String.raw`JSXText[value=/\S/]` }];

/**
 * An icon is named by a key of the typed registry. The native tab bar draws its own symbols rather than mounting the
 * Icon primitive, so the registry's type never reaches it: written there as a literal, a symbol name would be decided
 * in a second place.
 */
const ICON_SYNTAX: readonly SyntaxRestriction[] = [
  { policy: 'icon/symbol', selector: String.raw`JSXAttribute[name.name=/^(?:sf|md)$/] Literal` },
];

/** The tab bar is composed with NativeTabs: the JS tabs of Expo Router, imported directly or as the deprecated Tabs, do not render a native bar. */
const NAV_SYNTAX: readonly SyntaxRestriction[] = [
  { policy: 'nav/js-tabs', selector: String.raw`ImportDeclaration[source.value='expo-router/js-tabs']` },
  {
    policy: 'nav/js-tabs',
    selector: String.raw`ImportDeclaration[source.value='expo-router'] > ImportSpecifier[imported.name='Tabs']`,
  },
];

/** A style follows the theme in force: only the theme context and its root import a frozen theme, everyone else reads it from the parameter of createStyles. */
const THEME_SYNTAX: readonly SyntaxRestriction[] = [
  {
    policy: 'style/theme',
    selector: String.raw`ImportDeclaration[source.value='@huma/design-tokens'] > ImportSpecifier[imported.name=/^(?:LIGHT_THEME|DARK_THEME|THEMES)$/]`,
  },
];

/** A query is declared where its entity lives: the api segment of a slice builds the options, every screen composes them. */
const QUERY_SYNTAX: readonly SyntaxRestriction[] = [
  {
    policy: 'query/options',
    selector: String.raw`ImportDeclaration[source.value='@tanstack/react-query'] > ImportSpecifier[imported.name=/^(?:query|infiniteQuery)Options$/]`,
  },
];

/**
 * A route hands over strings: the routing module alone reads them, and a screen takes what an analyser gives back.
 * Re-exporting the reader is restricted beside importing it, since a module that passes it on launders it just as well.
 */
const ROUTE_PARAMS_SYNTAX: readonly SyntaxRestriction[] = [
  {
    policy: 'route/params',
    selector: String.raw`ImportDeclaration[source.value=/^expo-router(?:\/.*)?$/] > ImportSpecifier[imported.name=/^use(?:Local|Global)SearchParams$/]`,
  },
  {
    policy: 'route/params',
    selector: String.raw`ExportNamedDeclaration[source.value=/^expo-router(?:\/.*)?$/] > ExportSpecifier[local.name=/^use(?:Local|Global)SearchParams$/]`,
  },
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
  syntax: [
    ...CONFINED_NAMESPACES,
    ...STYLE_SYNTAX,
    ...THEME_SYNTAX,
    ...TEXT_SYNTAX,
    ...ICON_SYNTAX,
    ...NAV_SYNTAX,
    ...QUERY_SYNTAX,
    ...ROUTE_PARAMS_SYNTAX,
    ...HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.syntax),
  ],
  properties: HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.properties),
  globals: HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.globals),
  naming: HERMES_NAMING,
};

/**
 * The Node runtime with the gaps of Hermes on top: a package the app bundles is written for the tools that build it and
 * for the phone that runs it at once, so it keeps the rules of Node and loses the APIs Hermes has never had.
 */
const BUNDLED: Runtime = {
  ...NODE,
  syntax: [...NODE.syntax, ...HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.syntax)],
  properties: [...NODE.properties, ...HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.properties)],
  globals: [...NODE.globals, ...HERMES_GAP_RESTRICTIONS.flatMap((gap) => gap.globals)],
};

/** The restrictions of `runtime` for files of a narrower role, a route or a public entry. */
const narrowed = (runtime: Runtime, syntax: readonly SyntaxRestriction[]): Runtime => ({
  ...runtime,
  syntax: [...runtime.syntax, ...syntax],
});

/** The restrictions of `runtime` without the ones a place is exempt from, the inverse of `narrowed`: the theme's core keeps every rule but the theme lock. */
const exempt = (runtime: Runtime, syntax: readonly SyntaxRestriction[]): Runtime => ({
  ...runtime,
  syntax: runtime.syntax.filter((restriction) => !syntax.includes(restriction)),
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
      files: [...BUNDLED_FILES],
      ignores: ['**/*.test.ts'],
      rules: restrictions(BUNDLED, policies),
    },
    {
      files: [...HERMES_FILES],
      rules: restrictions(HERMES, policies),
    },
    {
      files: [...THEME_FILES],
      rules: restrictions(exempt(HERMES, THEME_SYNTAX), policies),
    },
    {
      files: [...QUERY_FILES],
      rules: restrictions(exempt(HERMES, QUERY_SYNTAX), policies),
    },
    {
      files: [...ROUTING_FILES],
      rules: restrictions(exempt(HERMES, ROUTE_PARAMS_SYNTAX), policies),
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
    spellingConfig([...JAVASCRIPT_FILES, ...TYPESCRIPT_FILES], policies),
    reactConfig(tsconfigRootDir),
    queryConfig(),
    boundariesConfig(tsconfigRootDir, policies),
  );
}
