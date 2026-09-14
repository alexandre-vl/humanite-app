import { access, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { temporaryDirectory } from '@huma/kit/fs';
import { expect, test } from 'vitest';
import { replaceTree, writeTree } from './workspace.ts';

test('writeTree creates nested text, binary and executable files', async () => {
  await using directory = await temporaryDirectory('fixtures-test');
  const root = directory.path;
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
});

test('writeTree refuses paths that leave the root', async () => {
  await using directory = await temporaryDirectory('fixtures-test');
  await expect(writeTree(directory.path, { '../escape.md': 'x' })).rejects.toThrow('Chemin hors de la racine');
  await expect(writeTree(directory.path, { '/etc/absolute.md': 'x' })).rejects.toThrow('Chemin hors de la racine');
  await expect(writeTree(directory.path, { '.': 'x' })).rejects.toThrow('Chemin hors de la racine');
});

test('replaceTree removes the files the next state drops and the directories they leave empty', async () => {
  await using directory = await temporaryDirectory('fixtures-test');
  await writeTree(directory.path, { 'a.md': '1', 'sub/deep/b.md': '2', 'sub/kept.md': '3' });
  await replaceTree(directory.path, { 'a.md': '1', 'sub/deep/b.md': '2', 'sub/kept.md': '3' }, { 'sub/kept.md': '4' });
  await expect(access(join(directory.path, 'a.md'))).rejects.toThrow('ENOENT');
  expect(await readdir(directory.path)).toEqual(['sub']);
  expect(await readdir(join(directory.path, 'sub'))).toEqual(['kept.md']);
  expect(await readFile(join(directory.path, 'sub/kept.md'), 'utf8')).toBe('4');
});
