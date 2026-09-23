import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { temporaryDirectory } from '@huma/kit/fs';
import { expect, test } from 'vitest';
import { readReferences } from './workspace.ts';

/** Writes a project of `apps/mobile` under `root` referencing each of `paths`. */
const project = async (root: string, name: string, paths: readonly string[]): Promise<void> => {
  await mkdir(join(root, 'apps', 'mobile'), { recursive: true });
  await writeFile(join(root, 'apps', 'mobile', name), JSON.stringify({ references: paths.map((path) => ({ path })) }));
};

/**
 * An app holds two projects: its own, and the one for its Node configuration beside it. The second is where a package
 * only the bundler's configuration imports is referenced, and reading the first alone called it missing.
 */
test('prend les références de chaque projet d’un paquet, une fois chacune', async () => {
  await using root = await temporaryDirectory('deps');
  await project(root.path, 'tsconfig.json', ['../../packages/contracts']);
  await project(root.path, 'tsconfig.node.json', ['../../packages/architecture', '../../packages/contracts']);
  expect(await readReferences(root.path, 'apps/mobile')).toEqual(['packages/contracts', 'packages/architecture']);
});

test('ne prête aucune référence à un paquet sans tsconfig.json', async () => {
  await using root = await temporaryDirectory('deps');
  await project(root.path, 'tsconfig.node.json', ['../../packages/architecture']);
  expect(await readReferences(root.path, 'apps/mobile')).toBeNull();
});
