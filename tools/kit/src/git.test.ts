import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import type { GitRepository } from './git.ts';
import {
  firstParentHistory,
  git,
  GIT_LOCAL_VARIABLES,
  isAncestor,
  isolatedRepository,
  listFiles,
  ownRepository,
  parseTrailers,
  readObjects,
  resolveCommit,
  stagedPaths,
  unstagedPaths,
  worktreeTreeId,
} from './git.ts';

const IDENTITY = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.org',
  GIT_AUTHOR_DATE: '2026-09-14T12:00:00+02:00',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.org',
  GIT_COMMITTER_DATE: '2026-09-14T12:00:00+02:00',
} as const;

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map(async (directory) => rm(directory, { recursive: true, force: true })));
});

async function scratch(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'kit-git-'));
  directories.push(directory);
  return directory;
}

/** A fresh repository with one commit per tree, isolated from the calling environment. */
async function repository(root: string, commits: readonly Readonly<Record<string, string>>[]): Promise<GitRepository> {
  await mkdir(root, { recursive: true });
  const repo = isolatedRepository(root, { ...process.env, ...IDENTITY });
  await git(repo, ['init', '--quiet', '--initial-branch=main']);
  for (const [index, tree] of commits.entries()) {
    for (const [path, content] of Object.entries(tree)) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), content);
    }
    await git(repo, ['add', '--all']);
    await git(repo, ['commit', '--quiet', '--no-verify', '-m', `c${String(index + 1)}`]);
  }
  return repo;
}

test('GIT_LOCAL_VARIABLES is exactly what git lists', async () => {
  const root = await scratch();
  const output = await git(isolatedRepository(root), ['rev-parse', '--local-env-vars']);
  expect(output.trim().split('\n').toSorted()).toEqual([...GIT_LOCAL_VARIABLES].toSorted());
});

describe('isolatedRepository', () => {
  test('a hook environment pointing at another repository cannot make it write there', async () => {
    const base = await scratch();
    const sentinel = await repository(join(base, 'sentinel'), [{ 'a.txt': 'sentinelle' }]);
    const sentinelHead = await resolveCommit(sentinel, 'HEAD');
    const hookEnvironment = {
      ...process.env,
      ...IDENTITY,
      GIT_DIR: join(base, 'sentinel', '.git'),
      GIT_INDEX_FILE: join(base, 'sentinel', '.git', 'index'),
      GIT_WORK_TREE: join(base, 'sentinel'),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.bare',
      GIT_CONFIG_VALUE_0: 'true',
    };
    const fixtureRoot = join(base, 'fixture');
    await mkdir(fixtureRoot);
    const fixture = isolatedRepository(fixtureRoot, hookEnvironment);
    await git(fixture, ['init', '--quiet', '--initial-branch=main']);
    await writeFile(join(fixtureRoot, 'b.txt'), 'fixture');
    await git(fixture, ['add', '--all']);
    await git(fixture, ['commit', '--quiet', '--no-verify', '-m', 'fixture']);

    expect(await resolveCommit(sentinel, 'HEAD')).toBe(sentinelHead);
    expect((await git(sentinel, ['config', '--get', 'core.bare'])).trim()).toBe('false');
    expect([...(await listFiles(fixture, 'index'))]).toEqual(['b.txt']);
  });
});

test('ownRepository resolves the relative variables of a hook against its directory', () => {
  const repo = ownRepository('/repo', { GIT_INDEX_FILE: '.git/index.lock', GIT_DIR: '/abs/.git' }, '/repo/sub');
  expect(repo.env['GIT_INDEX_FILE']).toBe('/repo/sub/.git/index.lock');
  expect(repo.env['GIT_DIR']).toBe('/abs/.git');
  expect(repo.env['LC_ALL']).toBe('C');
});

test('listFiles reads non-ASCII names, untracked files and skips deleted ones', async () => {
  const root = join(await scratch(), 'repo');
  const repo = await repository(root, [{ 'café é.md': 'x', 'gone.md': 'y' }]);
  await writeFile(join(root, 'nouveau ü.md'), 'z');
  await rm(join(root, 'gone.md'));
  expect([...(await listFiles(repo, 'worktree'))].toSorted()).toEqual(['café é.md', 'nouveau ü.md']);
  expect([...(await listFiles(repo, 'index'))].toSorted()).toEqual(['café é.md', 'gone.md']);
  expect([...(await unstagedPaths(repo))].toSorted()).toEqual(['gone.md', 'nouveau ü.md']);
});

test('readObjects returns binary contents and null for missing objects', async () => {
  const root = join(await scratch(), 'repo');
  const repo = await repository(root, [{ 'bin.dat': 'a\0b\nc', 'text.md': 'bonjour' }]);
  const objects = await readObjects(repo, ['HEAD:bin.dat', 'HEAD:absent.md', 'HEAD:text.md']);
  expect(Buffer.from(objects.get('HEAD:bin.dat') ?? []).toString('utf8')).toBe('a\0b\nc');
  expect(objects.get('HEAD:absent.md')).toBeNull();
  expect(Buffer.from(objects.get('HEAD:text.md') ?? []).toString('utf8')).toBe('bonjour');
});

test('firstParentHistory lists mainline commits and merges, oldest first, not branch commits', async () => {
  const root = join(await scratch(), 'repo');
  const repo = await repository(root, [{ 'docs/a.md': '1' }]);
  await git(repo, ['switch', '--quiet', '-c', 'side']);
  await writeFile(join(root, 'docs/b.md'), 'side');
  await git(repo, ['add', '--all']);
  await git(repo, ['commit', '--quiet', '--no-verify', '-m', 'side']);
  await git(repo, ['switch', '--quiet', 'main']);
  await writeFile(join(root, 'docs/a.md'), '2');
  await git(repo, ['commit', '--quiet', '--no-verify', '-am', 'main']);
  await git(repo, ['merge', '--quiet', '--no-ff', '--no-verify', '-m', 'merge', 'side']);

  const history = await firstParentHistory(repo, 'docs');
  expect(history.map((change) => change.paths)).toEqual([['docs/a.md'], ['docs/a.md'], ['docs/b.md']]);
  expect(history.every((change) => /^[0-9a-f]{40}$/u.test(change.commit))).toBe(true);
  expect(history[0]?.authorDate).toBe('2026-09-14T12:00:00+02:00');
});

test('stagedPaths works before the first commit and after it', async () => {
  const root = join(await scratch(), 'repo');
  const repo = await repository(root, []);
  await writeFile(join(root, 'a.md'), 'x');
  await git(repo, ['add', 'a.md']);
  expect(await stagedPaths(repo)).toEqual(['a.md']);
});

test('worktreeTreeId matches a commit of the whole working tree and leaves the index untouched', async () => {
  const root = join(await scratch(), 'repo');
  const repo = await repository(root, [{ 'a.md': '1' }]);
  await writeFile(join(root, 'a.md'), '2');
  await writeFile(join(root, 'b.md'), 'nouveau');
  const indexBefore = await readFile(join(root, '.git', 'index'));
  const treeId = await worktreeTreeId(repo);
  expect(await readFile(join(root, '.git', 'index'))).toEqual(indexBefore);
  await git(repo, ['add', '--all']);
  expect((await git(repo, ['write-tree'])).trim()).toBe(treeId);
});

test('isAncestor and parseTrailers', async () => {
  const root = join(await scratch(), 'repo');
  const repo = await repository(root, [{ 'a.md': '1' }, { 'a.md': '2' }]);
  expect(await isAncestor(repo, 'HEAD~1', 'HEAD')).toBe(true);
  expect(await isAncestor(repo, 'HEAD', 'HEAD~1')).toBe(false);
  const message = 'feat: titre\n\nCorps du message.\nNote: pas un trailer\n\nRefs: ADR-0001\nRefs:ADR-0002\n';
  expect(await parseTrailers(repo, message)).toEqual([
    { key: 'Refs', value: 'ADR-0001' },
    { key: 'Refs', value: 'ADR-0002' },
  ]);
});
