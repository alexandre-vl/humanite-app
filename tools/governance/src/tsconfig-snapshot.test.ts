import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { isJsonObject, parseJson } from '@huma/kit/json';
import { expect, test } from 'vitest';

/** The strict options every project inherits, and the snapshot `pnpm gen` writes of each project's options. */
const STRICT_PRESET = 'packages/tsconfig/strict.json';
const EFFECTIVE_CONFIG = 'packages/tsconfig/effective-config.json';

const readObject = async (root: string, path: string): Promise<Readonly<Record<string, unknown>>> => {
  const value = parseJson(await readFile(join(root, path), 'utf8'));
  if (!isJsonObject(value)) {
    throw new Error(`${path} illisible`);
  }
  return value;
};

test('every project of the solution keeps each strict option with its strict value', async () => {
  const root = await findWorkspaceRoot(import.meta.dirname);
  const preset = (await readObject(root, STRICT_PRESET))['compilerOptions'];
  const projects = await readObject(root, EFFECTIVE_CONFIG);
  const loosened = Object.entries(projects).flatMap(([project, config]) => {
    const options = isJsonObject(config) ? config['compilerOptions'] : undefined;
    return Object.entries(isJsonObject(preset) ? preset : {})
      .filter(([option, value]) => !isJsonObject(options) || JSON.stringify(options[option]) !== JSON.stringify(value))
      .map(([option]) => `${project} ${option}`);
  });
  expect(Object.keys(projects).length).toBeGreaterThan(0);
  expect(loosened).toEqual([]);
});
