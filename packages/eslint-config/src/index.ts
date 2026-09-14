import js from '@eslint/js';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export type WorkspaceConfigOptions = Readonly<{
  /** Directory holding the solution `tsconfig.json` that references every TypeScript project. */
  tsconfigRootDir: string;
  /** Globs of the code Metro bundles for Hermes, relative to that directory; any other TypeScript runs in Node. */
  hermesFiles: readonly string[];
}>;

const TYPESCRIPT_FILES = ['**/*.ts', '**/*.tsx'];

const JAVASCRIPT_FILES = ['**/*.js', '**/*.mjs', '**/*.cjs'];

const STRIP_ONLY = 'Node runs TypeScript by stripping types: this syntax fails at runtime';

const RELATIVE_JS = String.raw`/^\.{1,2}\/.*\.js$/`;

type RuleEntry = Linter.RuleEntry;

/** A restriction of `no-restricted-syntax`: an AST selector and why it is refused. */
type SyntaxRestriction = Readonly<{ selector: string; message: string }>;

/** A restriction of `no-restricted-properties`: `object.property` and why it is refused. */
type PropertyRestriction = Readonly<{ object: string; property: string; message: string }>;

/** An option of `@typescript-eslint/naming-convention`. */
type NamingRule = Readonly<Record<string, unknown>>;

const CORE_SYNTAX: readonly SyntaxRestriction[] = [
  { selector: 'ExportAllDeclaration', message: 'Export each name explicitly' },
];

const NODE_SYNTAX: readonly SyntaxRestriction[] = [
  { selector: 'Decorator', message: STRIP_ONLY },
  { selector: 'AccessorProperty, TSAbstractAccessorProperty', message: STRIP_ONLY },
  { selector: `ImportDeclaration[source.value=${RELATIVE_JS}]`, message: 'Import the .ts file' },
  { selector: `ExportNamedDeclaration[source.value=${RELATIVE_JS}]`, message: 'Export from the .ts file' },
  { selector: `ImportExpression[source.value=${RELATIVE_JS}]`, message: 'Import the .ts file' },
];

const FOCUSED_TESTS: readonly PropertyRestriction[] = ['describe', 'it', 'test'].map((object) => ({
  object,
  property: 'only',
  message: 'Focused tests hide the rest of the suite',
}));

const NODE_PROPERTIES: readonly PropertyRestriction[] = [
  { object: 'process', property: 'exit', message: 'Set process.exitCode so pending output is flushed' },
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

/**
 * The rules whose options a runtime extends. ESLint replaces the options of a rule set again by a later block, so each
 * runtime gets the complete lists instead of adding to the core ones.
 */
const restrictions = (
  syntax: readonly SyntaxRestriction[],
  properties: readonly PropertyRestriction[],
  naming: readonly NamingRule[],
): Readonly<Record<string, RuleEntry>> => ({
  'no-restricted-syntax': ['error', ...CORE_SYNTAX, ...syntax],
  'no-restricted-properties': ['error', ...FOCUSED_TESTS, ...properties],
  '@typescript-eslint/naming-convention': ['error', ...naming],
});

/** Rules that need no type information, for every file ESLint reads. */
const UNTYPED_RULES: Readonly<Record<string, RuleEntry>> = {
  curly: ['error', 'all'],
  eqeqeq: 'error',
  'no-console': 'error',
  'no-implicit-coercion': 'error',
  'no-param-reassign': 'error',
  'no-restricted-syntax': ['error', ...CORE_SYNTAX],
  'no-warning-comments': 'error',
  'object-shorthand': 'error',
  'prefer-template': 'error',
};

const TYPESCRIPT_RULES: Readonly<Record<string, RuleEntry>> = {
  ...UNTYPED_RULES,
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
export function defineWorkspaceConfig({ tsconfigRootDir, hermesFiles }: WorkspaceConfigOptions): Linter.Config[] {
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
      rules: UNTYPED_RULES,
    },
    {
      files: TYPESCRIPT_FILES,
      extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      rules: TYPESCRIPT_RULES,
    },
    {
      files: TYPESCRIPT_FILES,
      ignores: [...hermesFiles],
      rules: restrictions(NODE_SYNTAX, NODE_PROPERTIES, NODE_NAMING),
    },
    {
      files: [...hermesFiles],
      rules: restrictions([], [], HERMES_NAMING),
    },
  );
}
