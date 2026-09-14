import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createTemporaryDirectory, writeTree } from './workspace.ts';

test('writeTree creates nested files and the directory disappears on disposal', async () => {
  let root: string;
  {
    await using directory = await createTemporaryDirectory('fixtures-test');
    root = directory.path;
    await writeTree(root, { 'docs/adr/0000-a.md': 'contenu', 'README.md': 'racine' });
    expect(await readFile(join(root, 'docs/adr/0000-a.md'), 'utf8')).toBe('contenu');
    expect(await readFile(join(root, 'README.md'), 'utf8')).toBe('racine');
  }
  await expect(access(root)).rejects.toThrow('ENOENT');
});

test('writeTree refuses paths that leave the root', async () => {
  await using directory = await createTemporaryDirectory('fixtures-test');
  await expect(writeTree(directory.path, { '../escape.md': 'x' })).rejects.toThrow('Chemin hors de la racine');
  await expect(writeTree(directory.path, { '/etc/absolute.md': 'x' })).rejects.toThrow('Chemin hors de la racine');
  await expect(writeTree(directory.path, { '.': 'x' })).rejects.toThrow('Chemin hors de la racine');
});
