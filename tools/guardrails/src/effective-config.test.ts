import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { isList, isRecord } from '@huma/unknown';
import { expect, test } from 'vitest';

/** The snapshot `pnpm gen` writes of the configuration ESLint applies to each kind of file; `gen:check` keeps it fresh. */
const EFFECTIVE_CONFIG = 'packages/eslint-config/effective-config.json';

test('no rule of any kind of file is set to warn: the workspace tolerates no warning, presets included', async () => {
  const text = await readFile(join(await findWorkspaceRoot(import.meta.dirname), EFFECTIVE_CONFIG), 'utf8');
  const configs: unknown = JSON.parse(text);
  const warnings = Object.entries(isRecord(configs) ? configs : {}).flatMap(
    ([file, config]: readonly [string, unknown]) => {
      const rules: unknown = isRecord(config) ? config['rules'] : null;
      return Object.entries(isRecord(rules) ? rules : {})
        .filter(([, entry]: readonly [string, unknown]) => (isList(entry) ? entry[0] : entry) === 'warn')
        .map(([rule]) => `${file} ${rule}`);
    },
  );
  expect(warnings).toEqual([]);
});

/**
 * The typescript-eslint bans the ultra-typed vision rests on: `any`, `as`, `!`, the `@ts-ignore` escape and the
 * exhaustive switch. Their messages carry no policy tag, so no faulty-file fixture proves them, and the snapshot is
 * regenerated on any config change — without this, a ban turned off would pass both gen:check and the warn test above.
 */
const MANDATORY_RULES: readonly string[] = [
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-non-null-assertion',
  '@typescript-eslint/consistent-type-assertions',
  '@typescript-eslint/ban-ts-comment',
  '@typescript-eslint/switch-exhaustiveness-check',
];

test('every mandatory typed ban stays an error for each kind of TypeScript file', async () => {
  const text = await readFile(join(await findWorkspaceRoot(import.meta.dirname), EFFECTIVE_CONFIG), 'utf8');
  const configs: unknown = JSON.parse(text);
  const kinds = Object.entries(isRecord(configs) ? configs : {}).filter(
    ([file]) => file.endsWith('.ts') || file.endsWith('.tsx'),
  );
  const weakened = kinds.flatMap(([file, config]: readonly [string, unknown]) => {
    const rules: unknown = isRecord(config) ? config['rules'] : null;
    return MANDATORY_RULES.filter((rule) => {
      const entry: unknown = isRecord(rules) ? rules[rule] : undefined;
      return (isList(entry) ? entry[0] : entry) !== 'error';
    }).map((rule) => `${file} ${rule}`);
  });
  expect([kinds.length === 0, weakened]).toEqual([false, []]);
});
