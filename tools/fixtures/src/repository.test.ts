import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { temporaryDirectory } from '@huma/kit/fs';
import { git, listFiles, resolveCommit } from '@huma/kit/git';
import { expect, test } from 'vitest';
import { createRepository } from './repository.ts';

test('createRepository goes through commits, then staging, then the working tree', async () => {
  await using directory = await temporaryDirectory('fixtures-repo');
  const repository = await createRepository(directory.path, {
    commits: [{ files: { 'a.md': '1', 'gone/deep.md': 'x' } }, { files: { 'a.md': '2' }, message: 'feat: deux' }],
    staged: { 'a.md': '3', 'b.md': 'indexé' },
    worktree: { 'a.md': '4', 'b.md': 'indexé', 'c.md': 'non suivi' },
  });
  expect((await git(repository, ['log', '--format=%s'])).trim().split('\n')).toEqual(['feat: deux', 'état 1']);
  expect((await git(repository, ['show', 'HEAD:a.md'])).trim()).toBe('2');
  expect([...(await listFiles(repository, 'index'))].toSorted()).toEqual(['a.md', 'b.md']);
  expect([...(await listFiles(repository, 'worktree'))].toSorted()).toEqual(['a.md', 'b.md', 'c.md']);
  expect(await readFile(join(directory.path, 'a.md'), 'utf8')).toBe('4');
  await expect(readFile(join(directory.path, 'gone'))).rejects.toThrow('ENOENT');
});

test('a repository built from inside a git hook never touches the hook repository', async () => {
  await using hook = await temporaryDirectory('fixtures-hook');
  const outer = await createRepository(hook.path, { commits: [{ files: { 'outer.md': 'dépôt du hook' } }] });
  const head = await resolveCommit(outer, 'HEAD');
  const saved = { ...process.env };
  process.env['GIT_DIR'] = join(hook.path, '.git');
  process.env['GIT_INDEX_FILE'] = join(hook.path, '.git', 'index');
  process.env['GIT_WORK_TREE'] = hook.path;
  try {
    await using inner = await temporaryDirectory('fixtures-inner');
    const repository = await createRepository(inner.path, { commits: [{ files: { 'inner.md': 'fixture' } }] });
    expect([...(await listFiles(repository, 'index'))]).toEqual(['inner.md']);
  } finally {
    for (const name of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE']) {
      if (saved[name] === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = saved[name];
      }
    }
  }
  expect(await resolveCommit(outer, 'HEAD')).toBe(head);
  expect([...(await listFiles(outer, 'index'))]).toEqual(['outer.md']);
});

test('the commits of a plan never run hooks, which later commits run only when enabled', async () => {
  await using directory = await temporaryDirectory('fixtures-hooks');
  const marker = join(directory.path, 'hook-ran');
  const installHook = async (root: string): Promise<void> => {
    await mkdir(join(root, '.git/hooks'), { recursive: true });
    await writeFile(join(root, '.git/hooks/post-commit'), `#!/bin/sh\necho "$PWD" >> ${marker}\n`, { mode: 0o755 });
  };
  const hooked = join(directory.path, 'hooked');
  const plain = join(directory.path, 'plain');
  const enabled = await createRepository(hooked, { commits: [{ files: { 'a.md': '1' } }] }, { hooks: 'enabled' });
  const disabled = await createRepository(plain, { commits: [{ files: { 'a.md': '1' } }] });
  await installHook(hooked);
  await installHook(plain);
  await git(enabled, ['commit', '--quiet', '--allow-empty', '-m', 'suivant']);
  await git(disabled, ['commit', '--quiet', '--allow-empty', '-m', 'suivant']);
  expect(await readFile(marker, 'utf8')).toBe(`${hooked}\n`);
});
