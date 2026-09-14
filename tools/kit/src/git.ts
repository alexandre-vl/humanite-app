import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import type { RepoPath } from './paths.ts';
import { isRepoPath } from './paths.ts';
import type { Environment } from './process.ts';
import { run, runText } from './process.ts';

/**
 * Variables through which a running git process, a hook for instance, points child git processes at its
 * repository and index. `git rev-parse --local-env-vars` prints them; a test keeps this list identical.
 */
export const GIT_LOCAL_VARIABLES = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
] as const;

const PATH_VARIABLES = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_COMMON_DIR',
] as const;

const isInheritedGitVariable = (name: string): boolean =>
  GIT_LOCAL_VARIABLES.some((variable) => variable === name) || /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(name);

/** Stable, parseable output; no optional lock taken on a repository another process may be using. */
const PREDICTABLE = { LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' } as const;

/** A repository and the exact environment every git call on it runs with. */
export type GitRepository = Readonly<{ root: string; env: Environment }>;

/**
 * The repository a tool checks. Inside a git hook the variables git exported, `GIT_INDEX_FILE` above all, are kept
 * so that the tool reads the index being committed; relative values are resolved against `cwd`.
 */
export function ownRepository(
  root: string,
  env: Environment = process.env,
  cwd: string = process.cwd(),
): GitRepository {
  const absolute = Object.fromEntries(
    PATH_VARIABLES.flatMap((name) => {
      const value = env[name];
      return value === undefined || value === '' || isAbsolute(value) ? [] : [[name, resolve(cwd, value)]];
    }),
  );
  return { root, env: { ...env, ...absolute, ...PREDICTABLE } };
}

/**
 * A repository a tool creates or inspects on the side: a fixture, a clone. No variable of a calling git process and
 * no user or system configuration reaches it, so a tool run from a hook cannot write into the repository being
 * committed.
 */
export function isolatedRepository(root: string, env: Environment = process.env): GitRepository {
  const kept = Object.fromEntries(Object.entries(env).filter(([name]) => !isInheritedGitVariable(name)));
  return { root, env: { ...kept, ...PREDICTABLE, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } };
}

export type GitOptions = Readonly<{ input?: string | Uint8Array; successCodes?: readonly number[] }>;

const gitArguments = (repository: GitRepository, args: readonly string[]): readonly string[] => [
  '-C',
  repository.root,
  ...args,
];

export async function git(
  repository: GitRepository,
  args: readonly string[],
  options: GitOptions = {},
): Promise<string> {
  return runText('git', gitArguments(repository, args), { cwd: repository.root, env: repository.env, ...options });
}

export async function gitBytes(
  repository: GitRepository,
  args: readonly string[],
  options: GitOptions = {},
): Promise<Buffer> {
  return (await run('git', gitArguments(repository, args), { cwd: repository.root, env: repository.env, ...options }))
    .stdout;
}

const splitNul = (output: string): readonly string[] => output.split('\0').filter((entry) => entry !== '');

const repoPaths = (entries: readonly string[]): readonly RepoPath[] => entries.filter(isRepoPath);

export async function isWorkTree(repository: GitRepository): Promise<boolean> {
  try {
    return (await git(repository, ['rev-parse', '--is-inside-work-tree'])).trim() === 'true';
  } catch {
    return false;
  }
}

export const isShallow = async (repository: GitRepository): Promise<boolean> =>
  (await git(repository, ['rev-parse', '--is-shallow-repository'])).trim() === 'true';

/** Full commit id of `revision`, `null` when it does not name a commit (an unborn `HEAD`, for instance). */
export async function resolveCommit(repository: GitRepository, revision: string): Promise<string | null> {
  const output = await git(
    repository,
    ['rev-parse', '--verify', '--quiet', '--end-of-options', `${revision}^{commit}`],
    {
      successCodes: [0, 1],
    },
  );
  const commit = output.trim();
  return commit === '' ? null : commit;
}

export async function isAncestor(repository: GitRepository, ancestor: string, descendant: string): Promise<boolean> {
  const { exitCode } = await run(
    'git',
    gitArguments(repository, ['merge-base', '--is-ancestor', ancestor, descendant]),
    {
      cwd: repository.root,
      env: repository.env,
      successCodes: [0, 1],
    },
  );
  return exitCode === 0;
}

export const commonDirectory = async (repository: GitRepository): Promise<string> =>
  (await git(repository, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).trim();

/** Root of every worktree of the repository, the main one first. */
export async function worktreeRoots(repository: GitRepository): Promise<readonly string[]> {
  return splitNul(await git(repository, ['worktree', 'list', '--porcelain', '-z'])).flatMap((line) =>
    line.startsWith('worktree ') ? [line.slice('worktree '.length)] : [],
  );
}

/** Where the files of a check are read: the working tree as it is on disk, or the index about to be committed. */
export type FileSource = 'worktree' | 'index';

/** Tracked and untracked, non-ignored, non-deleted files of the working tree, or every file of the index. */
export async function listFiles(repository: GitRepository, source: FileSource): Promise<ReadonlySet<RepoPath>> {
  if (source === 'index') {
    return new Set(repoPaths(splitNul(await git(repository, ['ls-files', '-z', '--cached']))));
  }
  const present = splitNul(await git(repository, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']));
  const deleted = new Set(splitNul(await git(repository, ['ls-files', '-z', '--deleted'])));
  return new Set(repoPaths(present.filter((path) => !deleted.has(path))));
}

export type IndexEntry = Readonly<{ path: RepoPath; object: string }>;

export async function listIndexEntries(repository: GitRepository, pathspec: string): Promise<readonly IndexEntry[]> {
  return splitNul(await git(repository, ['ls-files', '-z', '--cached', '--stage', '--', pathspec])).flatMap((line) => {
    const match = /^\d{6} ([0-9a-f]+) \d\t(.+)$/su.exec(line);
    const [, object, path] = match ?? [];
    return object === undefined || path === undefined || !isRepoPath(path) ? [] : [{ path, object }];
  });
}

/** Paths with an unstaged change or untracked and not ignored: when empty, the index holds the whole working tree. */
export async function unstagedPaths(repository: GitRepository): Promise<readonly RepoPath[]> {
  const modified = splitNul(await git(repository, ['diff', '--name-only', '-z', '--no-renames']));
  const untracked = splitNul(await git(repository, ['ls-files', '-z', '--others', '--exclude-standard']));
  return repoPaths([...new Set([...modified, ...untracked])]);
}

/** Paths the index changes compared with `HEAD`, or with the empty tree before the first commit. */
export async function stagedPaths(repository: GitRepository): Promise<readonly RepoPath[]> {
  const base = (await resolveCommit(repository, 'HEAD')) ?? (await emptyTree(repository));
  return repoPaths(splitNul(await git(repository, ['diff', '--cached', '--name-only', '-z', '--no-renames', base])));
}

const emptyTree = async (repository: GitRepository): Promise<string> =>
  (await git(repository, ['hash-object', '-t', 'tree', '--stdin'], { input: '' })).trim();

/**
 * Contents of objects named `<revision>:<path>` or by id, read through one `git cat-file --batch` process;
 * `null` for a missing object.
 */
export async function readObjects(
  repository: GitRepository,
  names: readonly string[],
): Promise<ReadonlyMap<string, Uint8Array | null>> {
  const contents = new Map<string, Uint8Array | null>();
  if (names.length === 0) {
    return contents;
  }
  const output = await gitBytes(repository, ['cat-file', '--batch', '-Z'], { input: `${names.join('\0')}\0` });
  let offset = 0;
  for (const name of names) {
    const end = output.indexOf(0, offset);
    if (end === -1) {
      throw new Error(`Sortie de git cat-file tronquée avant ${name}`);
    }
    const header = output.subarray(offset, end).toString('utf8');
    offset = end + 1;
    const size = /^[0-9a-f]+ [a-z]+ (\d+)$/u.exec(header)?.[1];
    if (size === undefined) {
      contents.set(name, null);
      continue;
    }
    const length = Number(size);
    contents.set(name, output.subarray(offset, offset + length));
    offset += length + 1;
  }
  return contents;
}

export type CommitChanges = Readonly<{
  commit: string;
  /** ISO 8601 author date. */
  authorDate: string;
  /** Paths added, modified or deleted compared with the first parent. */
  paths: readonly RepoPath[];
}>;

const RECORD = '\x1e';
const FIELD = '\x1f';

/**
 * Commits of the first-parent chain of `HEAD` that touch `pathspec`, oldest first. A merge counts as the change it
 * brings to its first parent, so a decision made on a branch appears when it lands, in mainline order.
 */
export async function firstParentHistory(
  repository: GitRepository,
  pathspec: string,
): Promise<readonly CommitChanges[]> {
  const output = await git(repository, [
    'log',
    '--first-parent',
    '--diff-merges=first-parent',
    '--reverse',
    '--no-renames',
    '--no-color',
    '--no-show-signature',
    `--format=${RECORD}%H${FIELD}%aI`,
    '--name-only',
    '-z',
    'HEAD',
    '--',
    pathspec,
  ]);
  return output
    .split(RECORD)
    .filter((record) => record !== '')
    .map((record) => {
      const [header = '', ...rest] = record.split('\0');
      const [commit = '', authorDate = ''] = header.split(FIELD);
      const paths = rest.map((entry, index) => (index === 0 ? entry.replace(/^\n/u, '') : entry));
      return { commit, authorDate, paths: repoPaths(paths.filter((entry) => entry !== '')) };
    });
}

/**
 * Id of the tree that `git add --all` would commit, untracked files included. It is computed in a copy of the index,
 * so the index and the working tree stay untouched.
 */
export async function worktreeTreeId(repository: GitRepository): Promise<string> {
  const index = (await git(repository, ['rev-parse', '--path-format=absolute', '--git-path', 'index'])).trim();
  const directory = await mkdtemp(join(tmpdir(), 'huma-tree-'));
  try {
    const copy = join(directory, 'index');
    await copyFile(index, copy).catch((error: unknown) => {
      if (!(Error.isError(error) && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    });
    const scratch: GitRepository = { root: repository.root, env: { ...repository.env, GIT_INDEX_FILE: copy } };
    await git(scratch, ['add', '--all', '--', '.']);
    return (await git(scratch, ['write-tree'])).trim();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export type Trailer = Readonly<{ key: string; value: string }>;

/** Trailers of a commit message as git reads them: the last paragraph, when it is made of `Key: value` lines. */
export async function parseTrailers(repository: GitRepository, message: string): Promise<readonly Trailer[]> {
  const output = await git(repository, ['interpret-trailers', '--parse', '--no-divider'], { input: message });
  return output.split('\n').flatMap((line) => {
    const separator = line.indexOf(': ');
    return separator <= 0 ? [] : [{ key: line.slice(0, separator), value: line.slice(separator + 2) }];
  });
}
