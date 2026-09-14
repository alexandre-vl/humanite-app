import js from '@eslint/js';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export type NodeConfigOptions = Readonly<{
  /** Directory holding the solution `tsconfig.json` that references every TypeScript project. */
  tsconfigRootDir: string;
}>;

const STRIP_ONLY = 'Node runs TypeScript by stripping types: this syntax fails at runtime';
const RELATIVE_JS = String.raw`/^\.{1,2}\/.*\.js$/`;

/** Lint rules for TypeScript executed by Node without a build step (tools, configs, pure packages). */
export function defineNodeConfig({ tsconfigRootDir }: NodeConfigOptions): Linter.Config[] {
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
      files: ['**/*.ts'],
      extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
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
        '@typescript-eslint/naming-convention': [
          'error',
          { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
          { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'UPPER_CASE'] },
          { selector: 'typeLike', format: ['PascalCase'] },
          { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
          { selector: 'import', format: ['camelCase', 'PascalCase'] },
        ],
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
        curly: ['error', 'all'],
        eqeqeq: 'error',
        'no-console': 'error',
        'no-implicit-coercion': 'error',
        'no-param-reassign': 'error',
        'no-restricted-properties': [
          'error',
          { object: 'describe', property: 'only', message: 'Focused tests hide the rest of the suite' },
          { object: 'it', property: 'only', message: 'Focused tests hide the rest of the suite' },
          { object: 'test', property: 'only', message: 'Focused tests hide the rest of the suite' },
          { object: 'process', property: 'exit', message: 'Set process.exitCode so pending output is flushed' },
        ],
        'no-restricted-syntax': [
          'error',
          { selector: 'ExportAllDeclaration', message: 'Export each name explicitly' },
          { selector: 'Decorator', message: STRIP_ONLY },
          { selector: 'AccessorProperty, TSAbstractAccessorProperty', message: STRIP_ONLY },
          { selector: `ImportDeclaration[source.value=${RELATIVE_JS}]`, message: 'Import the .ts file' },
          { selector: `ExportNamedDeclaration[source.value=${RELATIVE_JS}]`, message: 'Export from the .ts file' },
          { selector: `ImportExpression[source.value=${RELATIVE_JS}]`, message: 'Import the .ts file' },
        ],
        'no-warning-comments': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',
      },
    },
  );
}
