import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { expect, test } from 'vitest';

/** The snapshot `pnpm gen` writes of the configuration ESLint applies to each kind of file; `gen:check` keeps it fresh. */
const EFFECTIVE_CONFIG = 'packages/eslint-config/effective-config.json';

test('no rule of any kind of file is set to warn: the workspace tolerates no warning, presets included', async () => {
  const text = await readFile(join(await findWorkspaceRoot(import.meta.dirname), EFFECTIVE_CONFIG), 'utf8');
  const configs: unknown = JSON.parse(text);
  const warnings = Object.entries(typeof configs === 'object' && configs !== null ? configs : {}).flatMap(
    ([file, config]: readonly [string, unknown]) => {
      const rules: unknown = typeof config === 'object' && config !== null ? Reflect.get(config, 'rules') : null;
      return Object.entries(typeof rules === 'object' && rules !== null ? rules : {})
        .filter(([, entry]: readonly [string, unknown]) => (Array.isArray(entry) ? entry[0] : entry) === 'warn')
        .map(([rule]) => `${file} ${rule}`);
    },
  );
  expect(warnings).toEqual([]);
});
