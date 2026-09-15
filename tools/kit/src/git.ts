import { realpathSync } from 'node:fs';
import { copyFile, mkdir, stat, utimes } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { errnoCode } from './errors.ts';
import { temporaryDirectory } from './fs.ts';
import type { RepoPath } from './paths.ts';
import { isRepoPath } from './paths.ts';
import type { Environment, RunResult } from './process.ts';
import { capture, ProcessError, run, runText } from './process.ts';
import { isOneOf } from './records.ts';
import { decodeUtf8 } from './text.ts';

/**
 * Variables through which a running git process, a hook for instance, points child git processes at its repository
 * and index. `git rev-parse --local-env-vars` prints them; a test keeps this list identical.
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

/** Local variables that name a path, resolved against the directory of the process that received them. */
const PATH_VARIABLES = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_COMMON_DIR',
] as const;

const isInheritedGitVariable = (name: string): boolean =>
  isOneOf(GIT_LOCAL_VARIABLES, name) || /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(name);

/**
 * Output that parses the same everywhere and history as it was committed: no translated message, no optional lock
 * taken on a repository another process uses, no prompt, and neither replace refs nor grafts rewriting commits.
 */
const PREDICTABLE = {
  LC_ALL: 'C',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  GIT_NO_REPLACE_OBJECTS: '1',
  GIT_GRAFT_FILE: '/dev/null',
} as const;

/** A repository and the exact environment every git call on it runs with; aborting `signal` stops those calls. */
export type GitRepository = Readonly<{ root: string; env: Environment; signal?: AbortSignal }>;

const realPath = (path: string): string => {
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
};

/**
 * The repository a tool checks, with the configuration of its user. Inside a git hook, which runs at the root of its
 * worktree, the variables git exported are kept so that the tool reads the index being committed; for any other
 * directory they are dropped, so a hook's index never leaks into another repository.
 */
export function ownRepository(
  root: string,
  env: Environment = process.env,
  cwd: string = process.cwd(),
): GitRepository {
  if (realPath(cwd) !== realPath(root)) {
    const kept = Object.fromEntries(Object.entries(env).filter(([name]) => !isInheritedGitVariable(name)));
    return { root, env: { ...kept, ...PREDICTABLE } };
  }
  const absolute = Object.fromEntries(
    PATH_VARIABLES.flatMap((name) => {
      const value = env[name];
      return value === undefined || value === '' || isAbsolute(value) ? [] : [[name, resolve(cwd, value)]];
    }),
  );
  return { root, env: { ...env, ...absolute, ...PREDICTABLE } };
}

/** Variables of the calling process an isolated git still needs to run. */
const KEPT_VARIABLES = ['PATH', 'TMPDIR'] as const;

/** A home that cannot exist without root: no user ignore file, attributes file or template reaches git. */
const NOWHERE = '/nonexistent/huma-git-isolation';

export type IsolationOptions = Readonly<{
  /** Variables the repository needs, a fixed identity for instance. */
  env?: Environment;
  /** Hooks stay disabled unless the repository exists to test them. */
  hooks?: 'disabled' | 'enabled';
  signal?: AbortSignal;
}>;

/**
 * A repository a tool creates or inspects on the side: a fixture, a clone. Only `PATH` and `TMPDIR` come from the
 * calling process: no variable of a calling git, no system, user or template configuration, no repository above it.
 */
export function isolatedRepository(root: string, options: IsolationOptions = {}): GitRepository {
  const kept = Object.fromEntries(
    KEPT_VARIABLES.flatMap((name) => {
      const value = process.env[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );
  const hooks =
    options.hooks === 'enabled'
      ? {}
      : { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/dev/null' };
  return {
    root,
    env: {
      ...kept,
      ...options.env,
      HOME: NOWHERE,
      XDG_CONFIG_HOME: NOWHERE,
      GIT_TEMPLATE_DIR: '',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_ATTR_NOSYSTEM: '1',
      GIT_CEILING_DIRECTORIES: dirname(resolve(root)),
      ...hooks,
      ...PREDICTABLE,
    },
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
}

export type GitOptions = Readonly<{ input?: string | Uint8Array; successCodes?: readonly number[] }>;

const processOptions = (repository: GitRepository, options: GitOptions) => ({
  cwd: repository.root,
  env: repository.env,
  ...options,
  ...(repository.signal === undefined ? {} : { signal: repository.signal }),
});

const gitArguments = (repository: GitRepository, args: readonly string[]): readonly string[] => [
  '-C',
  repository.root,
  ...args,
];

/** Standard output of a successful git command, as UTF-8 text. */
export async function git(
  repository: GitRepository,
  args: readonly string[],
  options: GitOptions = {},
): Promise<string> {
  return runText('git', gitArguments(repository, args), processOptions(repository, options));
}

async function gitRun(repository: GitRepository, args: readonly string[], options: GitOptions): Promise<RunResult> {
  return run('git', gitArguments(repository, args), processOptions(repository, options));
}

const splitNul = (output: string): readonly string[] => output.split('\0').filter((entry) => entry !== '');

const splitLines = (output: string): readonly string[] => output.split('\n').filter((line) => line !== '');

/** A path git listed; one that no repository path can name is an error, never silently dropped. */
const repoPathOf = (entry: string): RepoPath => {
  if (!isRepoPath(entry)) {
    throw new Error(`Chemin de fichier non portable : ${JSON.stringify(entry)}`);
  }
  return entry;
};

const repoPaths = (entries: readonly string[]): readonly RepoPath[] => entries.map(repoPathOf);

const OBJECT_ID = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;

const objectId = (entry: string): string => {
  if (!OBJECT_ID.test(entry)) {
    throw new Error(`Identifiant d’objet git inattendu : ${JSON.stringify(entry)}`);
  }
  return entry;
};

const objectIds = (entries: readonly string[]): readonly string[] => entries.map(objectId);

/** `false` outside any git worktree; a git that cannot run is an error. */
export async function isWorkTree(repository: GitRepository): Promise<boolean> {
  const captured = await capture(
    'git',
    gitArguments(repository, ['rev-parse', '--is-inside-work-tree']),
    processOptions(repository, {}),
  );
  if (captured.exit.kind === 'exited' && captured.exit.code === 128) {
    return false;
  }
  if (captured.exit.kind !== 'exited' || captured.exit.code !== 0) {
    throw new Error(`git rev-parse --is-inside-work-tree : ${captured.stderr.toString('utf8')}`);
  }
  return captured.stdout.toString('utf8').trim() === 'true';
}

export const isShallow = async (repository: GitRepository): Promise<boolean> =>
  (await git(repository, ['rev-parse', '--is-shallow-repository'])).trim() === 'true';

/** Full commit id of `revision`, `null` when it does not name a commit (an unborn `HEAD`, for instance). */
export async function resolveCommit(repository: GitRepository, revision: string): Promise<string | null> {
  const output = await git(
    repository,
    ['rev-parse', '--verify', '--quiet', '--end-of-options', `${revision}^{commit}`],
    { successCodes: [0, 1] },
  );
  const commit = output.trim();
  return commit === '' ? null : objectId(commit);
}

export async function isAncestor(repository: GitRepository, ancestor: string, descendant: string): Promise<boolean> {
  const { exitCode } = await gitRun(repository, ['merge-base', '--is-ancestor', ancestor, descendant], {
    successCodes: [0, 1],
  });
  return exitCode === 0;
}

/** Absolute paths git uses for each name of `names` (`index`, `objects`, `hooks`…), in the same order. */
export async function gitPaths(repository: GitRepository, names: readonly string[]): Promise<readonly string[]> {
  const output = await git(repository, [
    'rev-parse',
    '--path-format=absolute',
    ...names.flatMap((name) => ['--git-path', name]),
  ]);
  const paths = splitLines(output);
  if (paths.length !== names.length) {
    throw new Error(`git rev-parse --git-path : ${String(names.length)} chemins attendus, ${String(paths.length)} lus`);
  }
  return paths;
}

/**
 * Creates `ref` pointing at `object` only if no such ref exists: `false` when another process created it first. Refs
 * live in the common directory, so every worktree of the repository sees the same ones.
 */
export async function createRef(repository: GitRepository, ref: string, object: string): Promise<boolean> {
  const captured = await capture(
    'git',
    gitArguments(repository, ['update-ref', '--stdin']),
    processOptions(repository, { input: `create ${ref} ${objectId(object)}\n` }),
  );
  if (captured.exit.kind === 'exited' && captured.exit.code === 0) {
    return true;
  }
  if (captured.stderr.toString('utf8').includes('reference already exists')) {
    return false;
  }
  throw new ProcessError(`git update-ref --stdin (create ${ref})`, captured);
}

/** Names of the refs under `prefix`, sorted. */
export async function refNames(repository: GitRepository, prefix: string): Promise<readonly string[]> {
  return splitLines(await git(repository, ['for-each-ref', '--format=%(refname)', '--sort=refname', prefix]));
}

/** Short name of the branch `HEAD` is on, `null` when it is detached. */
export async function currentBranch(repository: GitRepository): Promise<string | null> {
  const name = (await git(repository, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { successCodes: [0, 1] })).trim();
  return name === '' ? null : name;
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
export const FILE_SOURCES = ['worktree', 'index'] as const;

export type FileSource = (typeof FILE_SOURCES)[number];

export const isFileSource = (value: string): value is FileSource => isOneOf(FILE_SOURCES, value);

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
  const lines = splitNul(await git(repository, ['ls-files', '-z', '--cached', '--stage', '--', pathspec]));
  return lines.map((line) => {
    const match = /^\d{6} ([0-9a-f]+) \d\t(.+)$/su.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) {
      throw new Error(`Entrée d’index illisible : ${JSON.stringify(line)}`);
    }
    return { object: objectId(match[1]), path: repoPathOf(match[2]) };
  });
}

/** Paths with an unstaged change or untracked and not ignored: when empty, the index holds the whole working tree. */
export async function unstagedPaths(repository: GitRepository): Promise<readonly RepoPath[]> {
  const modified = splitNul(await git(repository, ['diff', '--name-only', '-z', '--no-renames']));
  const untracked = splitNul(await git(repository, ['ls-files', '-z', '--others', '--exclude-standard']));
  return repoPaths([...new Set([...modified, ...untracked])]);
}

/** Paths the index changes compared with `base` (`HEAD` by default), or with the empty tree before the first commit. */
export async function stagedPaths(repository: GitRepository, base = 'HEAD'): Promise<readonly RepoPath[]> {
  const from = (await resolveCommit(repository, base)) ?? (await emptyTree(repository));
  return repoPaths(splitNul(await git(repository, ['diff', '--cached', '--name-only', '-z', '--no-renames', from])));
}

/** Id of the tree the index would commit, written to the object store as `git commit` would. */
export const writeTree = async (repository: GitRepository): Promise<string> =>
  objectId((await git(repository, ['write-tree'])).trim());

/** An index entry flagged skip-worktree (`S`) or assume-unchanged (lowercase tag) by `ls-files -v`. */
export type FlaggedEntry = Readonly<{ tag: string; path: RepoPath }>;

/** Index entries whose changes `git status` hides: skip-worktree and assume-unchanged ones. */
export async function flaggedIndexEntries(repository: GitRepository): Promise<readonly FlaggedEntry[]> {
  const entries = splitNul(await git(repository, ['-c', 'core.fileMode=true', 'ls-files', '-z', '-v']));
  return entries.flatMap((entry) => {
    const space = entry.indexOf(' ');
    const tag = entry.slice(0, space);
    const hidden = tag === 'S' || /^[a-z]$/u.test(tag);
    return hidden ? [{ tag, path: repoPathOf(entry.slice(space + 1)) }] : [];
  });
}

export type StatusEntry =
  /** A tracked path; `staged` and `unstaged` are the X and Y letters of `status`, `.` when unchanged. */
  | Readonly<{ kind: 'tracked'; staged: string; unstaged: string; path: RepoPath }>
  | Readonly<{ kind: 'unmerged'; path: RepoPath }>
  | Readonly<{ kind: 'untracked'; path: RepoPath }>;

/** Status of every changed, unmerged or untracked path, renames split and file modes compared. */
export async function statusEntries(repository: GitRepository): Promise<readonly StatusEntry[]> {
  const records = splitNul(
    await git(repository, [
      '-c',
      'core.fileMode=true',
      'status',
      '--porcelain=v2',
      '-z',
      '--untracked-files=all',
      '--no-renames',
      '--ignore-submodules=none',
    ]),
  );
  return records.flatMap((record): readonly StatusEntry[] => {
    const fields = record.split(' ');
    switch (fields[0] ?? '') {
      case '1':
        return [
          {
            kind: 'tracked',
            staged: fields[1]?.charAt(0) ?? '.',
            unstaged: fields[1]?.charAt(1) ?? '.',
            path: repoPathOf(fields.slice(8).join(' ')),
          },
        ];
      case 'u':
        return [{ kind: 'unmerged', path: repoPathOf(fields.slice(10).join(' ')) }];
      case '?':
        return [{ kind: 'untracked', path: repoPathOf(record.slice(2)) }];
      default:
        throw new Error(`Entrée de git status inattendue : ${JSON.stringify(record)}`);
    }
  });
}

/** One value of a configuration variable, with the scope and the file or command that set it. */
export type ConfigEntry = Readonly<{ scope: string; origin: string; key: string; value: string }>;

/**
 * Every value, in every scope, of the configuration variables whose lowercase key matches `pattern`, includes
 * followed as git follows them for this repository.
 */
export async function configEntries(repository: GitRepository, pattern: string): Promise<readonly ConfigEntry[]> {
  const fields = (
    await git(repository, ['config', '-z', '--show-scope', '--show-origin', '--get-regexp', pattern], {
      successCodes: [0, 1],
    })
  ).split('\0');
  const entries: ConfigEntry[] = [];
  for (let index = 0; index + 2 < fields.length; index += 3) {
    const [scope = '', origin = '', pair = ''] = fields.slice(index, index + 3);
    const newline = pair.indexOf('\n');
    entries.push({
      scope,
      origin,
      key: newline === -1 ? pair : pair.slice(0, newline),
      value: newline === -1 ? '' : pair.slice(newline + 1),
    });
  }
  return entries;
}

export type Trailer = Readonly<{ key: string; value: string }>;

const parseTrailerLines = (text: string): readonly Trailer[] =>
  splitLines(text).map((line) => {
    const colon = line.indexOf(':');
    return { key: line.slice(0, colon), value: line.slice(colon + 1).trim() };
  });

/** Trailers of a commit message as git reads them: its last paragraph, continuation lines unfolded. */
export const messageTrailers = async (repository: GitRepository, message: string): Promise<readonly Trailer[]> =>
  parseTrailerLines(await git(repository, ['interpret-trailers', '--parse', '--no-divider'], { input: message }));

/** Trailers of each commit of `ids`, read by one `git log` as `messageTrailers` reads a message. */
export async function commitTrailers(
  repository: GitRepository,
  ids: readonly string[],
): Promise<ReadonlyMap<string, readonly Trailer[]>> {
  if (ids.length === 0) {
    return new Map();
  }
  const records = splitNul(
    await git(repository, ['log', '--no-walk=unsorted', '--stdin', '-z', '--format=%H%x1f%(trailers:unfold,only)'], {
      input: `${objectIds(ids).join('\n')}\n`,
    }),
  );
  return new Map(
    records.map((record) => {
      const separator = record.indexOf('\x1f');
      return [objectId(record.slice(0, separator)), parseTrailerLines(record.slice(separator + 1))];
    }),
  );
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
  const { stdout: output } = await gitRun(repository, ['cat-file', '--batch', '-Z'], {
    input: `${names.join('\0')}\0`,
  });
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

export type CommitObject = Readonly<{
  id: string;
  parents: readonly string[];
  /** ISO 8601 author date with the author's offset, as `%aI` prints it. */
  authorDate: string;
  /** Raw message; `null` when it is not valid UTF-8. */
  message: string | null;
}>;

/** `%aI` of a raw `<seconds> <±hhmm>` date. */
function isoDate(seconds: number, offset: string): string {
  const sign = offset.startsWith('-') ? -1 : 1;
  const minutes = Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3, 5));
  const local = new Date((seconds + sign * minutes * 60) * 1000).toISOString().slice(0, 19);
  return `${local}${sign < 0 ? '-' : '+'}${offset.slice(1, 3)}:${offset.slice(3, 5)}`;
}

const BLANK_LINE = Buffer.from('\n\n');

function parseCommit(id: string, bytes: Uint8Array): CommitObject {
  const buffer = Buffer.from(bytes);
  const split = buffer.indexOf(BLANK_LINE);
  const header = decodeUtf8(split === -1 ? buffer : buffer.subarray(0, split));
  if (header === null) {
    throw new Error(`En-tête du commit ${id} illisible`);
  }
  const lines = header.split('\n');
  const parents = lines.flatMap((line) => (line.startsWith('parent ') ? [line.slice('parent '.length)] : []));
  const date = lines.flatMap((line) => {
    const match = /^author .* (\d+) ([+-]\d{4})$/u.exec(line);
    return match?.[1] === undefined || match[2] === undefined ? [] : [isoDate(Number(match[1]), match[2])];
  })[0];
  if (date === undefined) {
    throw new Error(`Auteur du commit ${id} illisible`);
  }
  return {
    id,
    parents: objectIds(parents),
    authorDate: date,
    message: split === -1 ? '' : decodeUtf8(buffer.subarray(split + BLANK_LINE.length)),
  };
}

/** Commits read by id through one `git cat-file --batch` process. */
export async function readCommits(
  repository: GitRepository,
  ids: readonly string[],
): Promise<ReadonlyMap<string, CommitObject>> {
  const objects = await readObjects(repository, objectIds(ids));
  return new Map(
    ids.map((id) => {
      const bytes = objects.get(id);
      if (bytes === undefined || bytes === null) {
        throw new Error(`Commit ${id} introuvable`);
      }
      return [id, parseCommit(id, bytes)];
    }),
  );
}

export type CommitChanges = CommitObject &
  Readonly<{
    /** Paths added, modified or deleted compared with the first parent, restricted to the pathspec. */
    paths: readonly RepoPath[];
  }>;

export type HistoryQuery = Readonly<{
  /** Last commit of the chain, `HEAD` when absent. */
  tip?: string;
  /** Only the commits after this one, along the chain that descends from it. */
  since?: string;
  /** Only the commits that change a path under it, and only those paths. */
  pathspec?: string;
}>;

/**
 * Commits of the first-parent chain of the tip, oldest first. A merge counts as the change it brings to its first
 * parent, so a decision made on a branch appears when it lands, in mainline order.
 */
export async function firstParentHistory(
  repository: GitRepository,
  query: HistoryQuery = {},
): Promise<readonly CommitChanges[]> {
  const tip = query.tip ?? 'HEAD';
  const range = query.since === undefined ? [tip] : ['--ancestry-path', `${query.since}..${tip}`];
  const pathspec = query.pathspec === undefined ? [] : [query.pathspec];
  const ids = objectIds(
    splitLines(await git(repository, ['rev-list', '--first-parent', '--reverse', ...range, '--', ...pathspec])),
  );
  if (ids.length === 0) {
    return [];
  }
  const commits = await readCommits(repository, ids);
  const pairs = ids.map((id) => {
    const parent = commits.get(id)?.parents[0];
    return parent === undefined ? id : `${id} ${parent}`;
  });
  const tokens = splitNul(
    await git(
      repository,
      ['diff-tree', '--stdin', '-z', '-r', '--no-renames', '--name-only', '--root', '--always', '--', ...pathspec],
      { input: `${pairs.join('\n')}\n` },
    ),
  );
  const paths = new Map<string, string[]>();
  let next = 0;
  let current: string[] | null = null;
  for (const token of tokens) {
    if (token === ids[next]) {
      current = [];
      paths.set(token, current);
      next += 1;
    } else if (current === null) {
      throw new Error(`Sortie de git diff-tree inattendue : ${JSON.stringify(token)}`);
    } else {
      current.push(token);
    }
  }
  if (next !== ids.length) {
    throw new Error(`git diff-tree : ${String(ids.length)} commits attendus, ${String(next)} lus`);
  }
  return ids.map((id) => {
    const commit = commits.get(id);
    if (commit === undefined) {
      throw new Error(`Commit ${id} introuvable`);
    }
    return { ...commit, paths: repoPaths(paths.get(id) ?? []) };
  });
}

/**
 * Id of the tree that `git add --all` would commit, untracked files included. It is computed in a copy of the index
 * with a private object directory, so the index, the working tree and the object store all stay untouched. The copy
 * keeps the times of the index: git trusts the cached stat of a file written no later than the index was, and a copy
 * dated now would hide a same-size change made in the same second as the last index write.
 */
export async function worktreeTreeId(repository: GitRepository): Promise<string> {
  const [index = '', objects = ''] = await gitPaths(repository, ['index', 'objects']);
  await using scratch = await temporaryDirectory('huma-tree');
  const copy = join(scratch.path, 'index');
  try {
    await copyFile(index, copy);
    const { atime, mtime } = await stat(index);
    await utimes(copy, atime, mtime);
  } catch (error) {
    if (errnoCode(error) !== 'ENOENT') {
      throw error;
    }
  }
  const privateObjects = join(scratch.path, 'objects');
  await mkdir(privateObjects);
  const alternates = [objects, repository.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'] ?? ''].filter((path) => path !== '');
  const scratchRepository: GitRepository = {
    ...repository,
    env: {
      ...repository.env,
      GIT_INDEX_FILE: copy,
      GIT_OBJECT_DIRECTORY: privateObjects,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: alternates.join(':'),
    },
  };
  await git(scratchRepository, ['add', '--all', '--', '.']);
  return (await git(scratchRepository, ['write-tree'])).trim();
}
