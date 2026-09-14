import { access, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createTemporaryDirectory, replaceTree, writeTree } from './workspace.ts';

test('writeTree creates nested text, binary and executable files; the directory disappears on disposal', async () => {
  let root: string;
  {
    await using directory = await createTemporaryDirectory('fixtures-test');
    root = directory.path;
    await writeTree(root, {
      'docs/adr/0000-a.md': 'contenu',
      'bin.dat': new Uint8Array([0xc3, 0x28]),
      'hooks/run': { content: '#!/bin/sh\n', mode: 0o755 },
      '..name/fichier.md': 'nom commençant par deux points',
    });
    expect(await readFile(join(root, 'docs/adr/0000-a.md'), 'utf8')).toBe('contenu');
    expect([...(await readFile(join(root, 'bin.dat')))]).toEqual([0xc3, 0x28]);
    expect((await stat(join(root, 'hooks/run'))).mode & 0o777).toBe(0o755);
    expect(await readFile(join(root, '..name/fichier.md'), 'utf8')).toBe('nom commençant par deux points');
  }
  await expect(access(root)).rejects.toThrow('ENOENT');
});

test('writeTree refuses paths that leave the root', async () => {
  await using directory = await createTemporaryDirectory('fixtures-test');
  await expect(writeTree(directory.path, { '../escape.md': 'x' })).rejects.toThrow('Chemin hors de la racine');
  await expect(writeTree(directory.path, { '/etc/absolute.md': 'x' })).rejects.toThrow('Chemin hors de la racine');
  await expect(writeTree(directory.path, { '.': 'x' })).rejects.toThrow('Chemin hors de la racine');
});

test('replaceTree removes the files the next state drops', async () => {
  await using directory = await createTemporaryDirectory('fixtures-test');
  await writeTree(directory.path, { 'a.md': '1', 'b.md': '2' });
  await replaceTree(directory.path, { 'a.md': '1', 'b.md': '2' }, { 'b.md': '3' });
  await expect(access(join(directory.path, 'a.md'))).rejects.toThrow('ENOENT');
  expect(await readFile(join(directory.path, 'b.md'), 'utf8')).toBe('3');
});
