import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { describeError, errnoCode } from './errors.ts';
import { readTextIfExists, temporaryDirectory } from './fs.ts';

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
