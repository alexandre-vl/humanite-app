import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { git, listFiles, resolveCommit } from '@huma/kit/git';
import { expect, test } from 'vitest';
import { createRepository } from './repository.ts';
import { createTemporaryDirectory } from './workspace.ts';

test('createRepository goes through commits, then staging, then the working tree', async () => {
  await using directory = await createTemporaryDirectory('fixtures-repo');
  const repository = await createRepository(directory.path, {
    commits: [{ files: { 'a.md': '1', 'gone.md': 'x' } }, { files: { 'a.md': '2' }, message: 'feat: deux' }],
    staged: { 'a.md': '3', 'b.md': 'indexé' },
    worktree: { 'a.md': '4', 'b.md': 'indexé', 'c.md': 'non suivi' },
  });
  expect((await git(repository, ['log', '--format=%s'])).trim().split('\n')).toEqual(['feat: deux', 'état 1']);
  expect((await git(repository, ['show', 'HEAD:a.md'])).trim()).toBe('2');
  expect([...(await listFiles(repository, 'index'))].toSorted()).toEqual(['a.md', 'b.md']);
  expect(await readFile(join(directory.path, 'a.md'), 'utf8')).toBe('4');
  expect((await git(repository, ['config', '--get', 'core.hooksPath'])).trim()).toBe('/dev/null');
});

test('a repository built from inside a git hook never touches the hook repository', async () => {
  await using hook = await createTemporaryDirectory('fixtures-hook');
  const outer = await createRepository(hook.path, { commits: [{ files: { 'outer.md': 'dépôt du hook' } }] });
  const head = await resolveCommit(outer, 'HEAD');
  const saved = { ...process.env };
  process.env['GIT_DIR'] = join(hook.path, '.git');
  process.env['GIT_INDEX_FILE'] = join(hook.path, '.git', 'index');
  process.env['GIT_WORK_TREE'] = hook.path;
  try {
    await using inner = await createTemporaryDirectory('fixtures-inner');
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
