import { mkdir, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { temporaryDirectory } from './fs.ts';
import type { GitRepository } from './git.ts';
import {
  commitTrailers,
  configEntries,
  firstParentHistory,
  flaggedIndexEntries,
  git,
  GIT_LOCAL_VARIABLES,
  gitPaths,
  isAncestor,
  isolatedRepository,
  isWorkTree,
  listFiles,
  listIndexEntries,
  messageTrailers,
  ownRepository,
  readObjects,
  resolveCommit,
  stagedPaths,
  statusEntries,
  unstagedPaths,
  worktreeTreeId,
  writeTree,
} from './git.ts';

const IDENTITY = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.org',
  GIT_AUTHOR_DATE: '2026-09-14T12:00:00+02:00',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.org',
  GIT_COMMITTER_DATE: '2026-09-14T12:00:00+02:00',
} as const;

async function writeFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), content);
  }
}

/** A fresh isolated repository with one commit per tree. */
async function repository(root: string, commits: readonly Readonly<Record<string, string>>[]): Promise<GitRepository> {
  await mkdir(root, { recursive: true });
  const repo = isolatedRepository(root, { env: IDENTITY });
  await git(repo, ['init', '--quiet', '--initial-branch=main']);
  for (const [index, files] of commits.entries()) {
    await writeFiles(root, files);
    await git(repo, ['add', '--all']);
    await git(repo, ['commit', '--quiet', '-m', `c${String(index + 1)}`]);
  }
  return repo;
}

/** Runs `body` with `variables` set in the environment of this process, then restores it. */
async function withEnvironment(variables: Readonly<Record<string, string>>, body: () => Promise<void>): Promise<void> {
  const saved = new Map(Object.keys(variables).map((name) => [name, process.env[name]]));
  Object.assign(process.env, variables);
  try {
    await body();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = value;
      }
    }
  }
}

const looseObjectCount = async (root: string): Promise<number> => {
  const directories = (await readdir(join(root, '.git', 'objects'))).filter((name) => /^[0-9a-f]{2}$/u.test(name));
  const counts = await Promise.all(
    directories.map(async (name) => (await readdir(join(root, '.git', 'objects', name))).length),
  );
  return counts.reduce((total, count) => total + count, 0);
};

test('GIT_LOCAL_VARIABLES is exactly what git lists', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const output = await git(isolatedRepository(directory.path), ['rev-parse', '--local-env-vars']);
  expect(output.trim().split('\n').toSorted()).toEqual([...GIT_LOCAL_VARIABLES].toSorted());
});

describe('isolatedRepository', () => {
  test('the variables of a calling hook cannot make a fixture write into the hook repository', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const sentinelRoot = join(directory.path, 'sentinel');
    const sentinel = await repository(sentinelRoot, [{ 'a.txt': 'sentinelle' }]);
    const sentinelHead = await resolveCommit(sentinel, 'HEAD');
    const fixtureRoot = join(directory.path, 'fixture');
    await withEnvironment(
      {
        GIT_DIR: join(sentinelRoot, '.git'),
        GIT_INDEX_FILE: join(sentinelRoot, '.git', 'index'),
        GIT_WORK_TREE: sentinelRoot,
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'core.bare',
        GIT_CONFIG_VALUE_0: 'true',
      },
      async () => {
        const fixture = await repository(fixtureRoot, [{ 'b.txt': 'fixture' }]);
        expect([...(await listFiles(fixture, 'index'))]).toEqual(['b.txt']);
      },
    );
    expect(await resolveCommit(sentinel, 'HEAD')).toBe(sentinelHead);
    expect((await git(sentinel, ['config', '--get', 'core.bare'])).trim()).toBe('false');
  });

  test('no ignore file, attributes, template hook or repository above reaches a fixture', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const home = join(directory.path, 'home');
    const marker = join(directory.path, 'template-hook-ran');
    await writeFiles(home, { '.config/git/ignore': '*.md\n', '.config/git/attributes': '*.txt text\n' });
    await mkdir(join(home, 'templates/hooks'), { recursive: true });
    await writeFile(join(home, 'templates/hooks/post-commit'), `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 });
    await git(isolatedRepository(home), ['init', '--quiet']);
    const root = join(home, 'nested', 'fixture');
    await withEnvironment(
      { HOME: home, XDG_CONFIG_HOME: join(home, '.config'), GIT_TEMPLATE_DIR: join(home, 'templates') },
      async () => {
        await mkdir(root, { recursive: true });
        expect(await isWorkTree(isolatedRepository(root))).toBe(false);
        const repo = await repository(root, [{ 'adr.md': 'décision\n', 'crlf.txt': 'a\r\nb\r\n' }]);
        expect([...(await listFiles(repo, 'index'))].toSorted()).toEqual(['adr.md', 'crlf.txt']);
        const blob = (await readObjects(repo, ['HEAD:crlf.txt'])).get('HEAD:crlf.txt');
        expect(Buffer.from(blob ?? []).toString('utf8')).toBe('a\r\nb\r\n');
      },
    );
    await expect(readFile(marker)).rejects.toThrow('ENOENT');
  });

  test('hooks run only when the repository enables them', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const marker = join(directory.path, 'hook-ran');
    const root = join(directory.path, 'repo');
    const repo = await repository(root, [{ 'a.txt': '1' }]);
    await mkdir(join(root, '.git/hooks'));
    await writeFile(join(root, '.git/hooks/post-commit'), `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 });
    await git(repo, ['commit', '--quiet', '--allow-empty', '-m', 'sans hook']);
    await expect(readFile(marker)).rejects.toThrow('ENOENT');
    const enabled = isolatedRepository(root, { env: IDENTITY, hooks: 'enabled' });
    await git(enabled, ['commit', '--quiet', '--allow-empty', '-m', 'avec hook']);
    expect(await readFile(marker, 'utf8')).toBe('');
  });

  test('aborting the signal of a repository stops its git calls', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const repo = isolatedRepository(directory.path, { signal: AbortSignal.abort() });
    await expect(git(repo, ['init', '--quiet'])).rejects.toThrow('interrompu');
  });
});

describe('ownRepository', () => {
  test('keeps the variables of a hook running at the root, resolved against it', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const repo = ownRepository(
      directory.path,
      { GIT_INDEX_FILE: '.git/index.lock', GIT_DIR: '/abs/.git', HOME: '/home/x' },
      directory.path,
    );
    expect(repo.env['GIT_INDEX_FILE']).toBe(join(directory.path, '.git/index.lock'));
    expect(repo.env['GIT_DIR']).toBe('/abs/.git');
    expect(repo.env['HOME']).toBe('/home/x');
    expect(repo.env['GIT_NO_REPLACE_OBJECTS']).toBe('1');
  });

  test('drops the variables of a hook for any other directory', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const repo = ownRepository(
      join(directory.path, 'other'),
      { GIT_INDEX_FILE: '.git/index.lock', GIT_CONFIG_KEY_0: 'core.bare', HOME: '/home/x' },
      directory.path,
    );
    expect(repo.env['GIT_INDEX_FILE']).toBeUndefined();
    expect(repo.env['GIT_CONFIG_KEY_0']).toBeUndefined();
    expect(repo.env['HOME']).toBe('/home/x');
  });
});

test('listFiles reads non-ASCII names, untracked files, skips deleted ones and refuses non-portable names', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, [{ 'café é.md': 'x', 'gone.md': 'y' }]);
  await writeFile(join(root, 'nouveau ü.md'), 'z');
  await rm(join(root, 'gone.md'));
  expect([...(await listFiles(repo, 'worktree'))].toSorted()).toEqual(['café é.md', 'nouveau ü.md']);
  expect([...(await listFiles(repo, 'index'))].toSorted()).toEqual(['café é.md', 'gone.md']);
  expect([...(await unstagedPaths(repo))].toSorted()).toEqual(['gone.md', 'nouveau ü.md']);
  expect((await listIndexEntries(repo, '.')).map((entry) => entry.path).toSorted()).toEqual(['café é.md', 'gone.md']);
  await writeFile(join(root, 'back\\slash.md'), 'w');
  await expect(listFiles(repo, 'worktree')).rejects.toThrow('Chemin de fichier non portable : "back\\\\slash.md"');
});

test('readObjects returns binary contents and null for missing objects', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const repo = await repository(join(directory.path, 'repo'), [{ 'bin.dat': 'a\0b\nc', 'text.md': 'bonjour' }]);
  const objects = await readObjects(repo, ['HEAD:bin.dat', 'HEAD:absent.md', 'HEAD:text.md']);
  expect(Buffer.from(objects.get('HEAD:bin.dat') ?? []).toString('utf8')).toBe('a\0b\nc');
  expect(objects.get('HEAD:absent.md')).toBeNull();
  expect(Buffer.from(objects.get('HEAD:text.md') ?? []).toString('utf8')).toBe('bonjour');
});

describe('firstParentHistory', () => {
  async function branchyRepository(root: string): Promise<GitRepository> {
    const repo = await repository(root, [{ 'docs/a.md': '1', 'docs/nl\nname.md': 'x', 'docs/sp ace.md': 'y' }]);
    await git(repo, ['switch', '--quiet', '-c', 'side']);
    await writeFiles(root, { 'docs/b.md': 'side' });
    await git(repo, ['add', '--all']);
    await git(repo, ['commit', '--quiet', '-m', 'side']);
    await git(repo, ['switch', '--quiet', 'main']);
    await writeFiles(root, { 'docs/a.md': '2', 'other.md': 'hors docs' });
    await git(repo, ['add', '--all']);
    await git(repo, ['commit', '--quiet', '-m', 'feat: main\n\nCorps \x1e avec séparateurs\n\nRefs: ADR-0001']);
    await git(repo, ['merge', '--quiet', '--no-ff', '-m', 'merge', 'side']);
    return repo;
  }

  test('lists mainline commits and merges oldest first, with their first-parent paths and messages', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const repo = await branchyRepository(join(directory.path, 'repo'));
    const history = await firstParentHistory(repo);
    expect(history.map((commit) => commit.paths)).toEqual([
      ['docs/a.md', 'docs/nl\nname.md', 'docs/sp ace.md'],
      ['docs/a.md', 'other.md'],
      ['docs/b.md'],
    ]);
    expect(history.map((commit) => commit.parents.length)).toEqual([0, 1, 2]);
    expect(history[0]?.authorDate).toBe('2026-09-14T12:00:00+02:00');
    expect(history[1]?.message).toBe('feat: main\n\nCorps \x1e avec séparateurs\n\nRefs: ADR-0001\n');
  });

  test('restricts commits and paths to a pathspec, and starts after a given commit', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const repo = await branchyRepository(join(directory.path, 'repo'));
    const all = await firstParentHistory(repo);
    const other = await firstParentHistory(repo, { pathspec: 'other.md' });
    expect(other.map((commit) => [commit.id, commit.paths])).toEqual([[all[1]?.id, ['other.md']]]);
    const since = await firstParentHistory(repo, { since: all[0]?.id ?? '' });
    expect(since.map((commit) => commit.id)).toEqual([all[1]?.id, all[2]?.id]);
  });

  test('ignores replace refs and grafts', async () => {
    await using directory = await temporaryDirectory('kit-git');
    const root = join(directory.path, 'repo');
    const repo = await repository(root, [{ 'a.md': '1' }, { 'a.md': '2' }, { 'a.md': '3' }]);
    await git(repo, ['replace', '--graft', 'HEAD', 'HEAD~2']);
    expect((await firstParentHistory(repo)).map((commit) => commit.paths)).toHaveLength(3);
  });
});

test('stagedPaths works before the first commit', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, []);
  await writeFile(join(root, 'a.md'), 'x');
  await git(repo, ['add', 'a.md']);
  expect(await stagedPaths(repo)).toEqual(['a.md']);
});

test('worktreeTreeId matches a commit of the whole working tree and writes neither the index nor objects', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, [{ 'a.md': '1' }]);
  await writeFile(join(root, 'a.md'), '2');
  await writeFile(join(root, 'b.md'), 'nouveau');
  const indexBefore = await readFile(join(root, '.git', 'index'));
  const objectsBefore = await looseObjectCount(root);
  const treeId = await worktreeTreeId(repo);
  expect(await readFile(join(root, '.git', 'index'))).toEqual(indexBefore);
  expect(await looseObjectCount(root)).toBe(objectsBefore);
  await git(repo, ['add', '--all']);
  expect((await git(repo, ['write-tree'])).trim()).toBe(treeId);
});

test('worktreeTreeId sees a same-size change git can only tell from a racily clean index entry', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, []);
  // Whole seconds of the mtime and sizes only, as git compares them within a second without nanosecond times.
  await git(repo, ['config', 'core.checkStat', 'minimal']);
  await git(repo, ['config', 'core.trustCtime', 'false']);
  const past = new Date(Date.now() - 60_000);
  await writeFile(join(root, 'a.md'), '1');
  await utimes(join(root, 'a.md'), past, past);
  await git(repo, ['add', '--all']);
  await git(repo, ['commit', '--quiet', '-m', 'c1']);
  // The entry is now racily clean: the index is no newer than the file. A same-size write keeping the file's time
  // leaves only that to tell the change from.
  await utimes(join(root, '.git', 'index'), past, past);
  await writeFile(join(root, 'a.md'), '2');
  await utimes(join(root, 'a.md'), past, past);
  const treeId = await worktreeTreeId(repo);
  await git(repo, ['add', '--all']);
  expect((await git(repo, ['write-tree'])).trim()).toBe(treeId);
});

test('statusEntries and flaggedIndexEntries show every difference between the index and the working tree', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, [{ 'a b.md': '1', 'c.md': '1', 'd.md': '1', 'e.sh': '1' }]);
  await writeFile(join(root, 'a b.md'), '2');
  await writeFile(join(root, 'c.md'), '2');
  await git(repo, ['add', 'c.md']);
  await writeFile(join(root, 'nouveau é.md'), 'x');
  await git(repo, ['update-index', '--skip-worktree', 'd.md']);
  await writeFile(join(root, 'd.md'), 'caché');
  await git(repo, ['-c', 'core.fileMode=false', 'update-index', '--chmod=+x', 'e.sh']);
  expect(await statusEntries(repo)).toEqual([
    { kind: 'tracked', staged: '.', unstaged: 'M', path: 'a b.md' },
    { kind: 'tracked', staged: 'M', unstaged: '.', path: 'c.md' },
    { kind: 'tracked', staged: 'M', unstaged: 'M', path: 'e.sh' },
    { kind: 'untracked', path: 'nouveau é.md' },
  ]);
  expect(await flaggedIndexEntries(repo)).toEqual([{ tag: 'S', path: 'd.md' }]);
  expect(await writeTree(repo)).toMatch(/^[0-9a-f]{40}$/u);
});

test('configEntries reads every scope and origin, and nothing when unset', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  await repository(root, []);
  const repo = isolatedRepository(root, { hooks: 'enabled' });
  expect(await configEntries(repo, String.raw`^core\.hookspath$`)).toEqual([]);
  await git(repo, ['config', 'core.hooksPath', '/tmp/a b']);
  await git(repo, ['config', 'includeIf.onbranch:x.path', 'autre.cfg']);
  expect(await configEntries(repo, String.raw`^core\.hookspath$`)).toEqual([
    { scope: 'local', origin: 'file:.git/config', key: 'core.hookspath', value: '/tmp/a b' },
  ]);
  expect((await configEntries(repo, String.raw`^includeif\.`)).map((entry) => entry.key)).toEqual([
    'includeif.onbranch:x.path',
  ]);
  expect(await configEntries(isolatedRepository(root), String.raw`^core\.hookspath$`)).toEqual([
    { scope: 'local', origin: 'file:.git/config', key: 'core.hookspath', value: '/tmp/a b' },
    { scope: 'command', origin: 'command line:', key: 'core.hookspath', value: '/dev/null' },
  ]);
});

test('messageTrailers and commitTrailers read trailers as git does', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, []);
  const message = 'feat: x\n\nCorps.\n\nRefs: ADR-0001\nRefs: ADR-0002\nCo-authored-by: A <a@example.org>\n';
  expect(await messageTrailers(repo, message)).toEqual([
    { key: 'Refs', value: 'ADR-0001' },
    { key: 'Refs', value: 'ADR-0002' },
    { key: 'Co-authored-by', value: 'A <a@example.org>' },
  ]);
  expect(await messageTrailers(repo, 'feat: x\n\nTrois lignes\nde prose\nRefs: ADR-0001\n')).toEqual([]);
  await git(repo, ['commit', '--quiet', '--allow-empty', '-m', message]);
  await git(repo, ['commit', '--quiet', '--allow-empty', '-m', 'fix: y']);
  const [first = '', second = ''] = (await git(repo, ['rev-list', '--reverse', 'HEAD'])).trim().split('\n');
  expect(await commitTrailers(repo, [second, first])).toEqual(
    new Map([
      [second, []],
      [first, await messageTrailers(repo, message)],
    ]),
  );
});

test('isAncestor, isWorkTree and gitPaths', async () => {
  await using directory = await temporaryDirectory('kit-git');
  const root = join(directory.path, 'repo');
  const repo = await repository(root, [{ 'a.md': '1' }, { 'a.md': '2' }]);
  expect(await isAncestor(repo, 'HEAD~1', 'HEAD')).toBe(true);
  expect(await isAncestor(repo, 'HEAD', 'HEAD~1')).toBe(false);
  expect(await isWorkTree(repo)).toBe(true);
  expect(await isWorkTree(isolatedRepository(directory.path))).toBe(false);
  expect(await gitPaths(repo, ['index', 'hooks'])).toEqual([join(root, '.git/index'), '/dev/null']);
  expect(await gitPaths(isolatedRepository(root, { hooks: 'enabled' }), ['hooks'])).toEqual([join(root, '.git/hooks')]);
});
