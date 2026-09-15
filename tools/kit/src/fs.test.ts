import { access, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { describeError, errnoCode } from './errors.ts';
import {
  directoryNames,
  isAccessible,
  readTextIfExists,
  resolveExistingPath,
  temporaryDirectory,
  temporaryDirectoryWith,
} from './fs.ts';

test('directoryNames lists a directory and returns null for a file or a missing path', async () => {
  await using directory = await temporaryDirectory('kit-fs');
  await writeFile(join(directory.path, 'a.txt'), 'x');
  expect(await directoryNames(directory.path)).toEqual(['a.txt']);
  expect(await directoryNames(join(directory.path, 'a.txt'))).toBeNull();
  expect(await directoryNames(join(directory.path, 'absent'))).toBeNull();
});

test('resolveExistingPath follows the links of the existing part and keeps the missing rest', async () => {
  await using directory = await temporaryDirectory('kit-fs');
  const root = await realpath(directory.path);
  await mkdir(join(root, 'real/inner'), { recursive: true });
  await symlink(join(root, 'real'), join(root, 'link'));
  expect(await resolveExistingPath(join(root, 'link/inner/new/file.txt'))).toBe(join(root, 'real/inner/new/file.txt'));
  expect(await resolveExistingPath(join(root, 'link'))).toBe(join(root, 'real'));
  expect(await resolveExistingPath('/nonexistent/huma/a')).toBe('/nonexistent/huma/a');
});

test('temporaryDirectory is removed with its content on disposal', async () => {
  let path: string;
  {
    await using directory = await temporaryDirectory('kit-fs');
    path = directory.path;
    await mkdir(join(path, 'a/b'), { recursive: true });
    await writeFile(join(path, 'a/b/c.txt'), 'x');
  }
  await expect(access(path)).rejects.toThrow('ENOENT');
});

test('readTextIfExists reads a file, returns null for a missing one and throws any other failure', async () => {
  await using directory = await temporaryDirectory('kit-fs');
  await writeFile(join(directory.path, 'a.txt'), 'é');
  expect(await readTextIfExists(join(directory.path, 'a.txt'))).toBe('é');
  expect(await readTextIfExists(join(directory.path, 'absent.txt'))).toBeNull();
  await expect(readTextIfExists(directory.path)).rejects.toThrow('EISDIR');
});

test('errnoCode and describeError', async () => {
  const error = await access('/nonexistent/huma').catch((caught: unknown) => caught);
  expect(errnoCode(error)).toBe('ENOENT');
  expect(errnoCode(new Error('x'))).toBeNull();
  expect(errnoCode('ENOENT')).toBeNull();
  expect(describeError(new Error('boom'))).toContain('Error: boom');
  expect(describeError(Object.create(null))).toBe('valeur non Error levée (object)');
});

test('a temporary directory filled before its caller holds it is removed when filling fails', async () => {
  let attempted = '';
  await expect(
    temporaryDirectoryWith('kit-filled', async (path) => {
      attempted = path;
      await writeFile(join(path, 'a.txt'), 'x');
      throw new Error('remplissage raté');
    }),
  ).rejects.toThrow('remplissage raté');
  expect(await isAccessible(attempted)).toBe(false);

  const kept = await (async () => {
    await using filled = await temporaryDirectoryWith('kit-filled', async (path) => {
      const inner = join(path, 'b');
      await mkdir(inner);
      return { inner };
    });
    expect(await isAccessible(filled.inner)).toBe(true);
    return filled.inner;
  })();
  expect(await isAccessible(kept)).toBe(false);
});
