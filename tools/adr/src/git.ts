import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Environment for every git call: no optional lock taken on the user's repository, stable messages. */
const GIT_ENVIRONMENT = { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' };

export async function git(root: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    env: GIT_ENVIRONMENT,
    maxBuffer: 256 * 1024 * 1024,
  });
  return stdout;
}

export async function isRepository(root: string): Promise<boolean> {
  try {
    return (await git(root, ['rev-parse', '--is-inside-work-tree'])).trim() === 'true';
  } catch {
    return false;
  }
}

export const isShallow = async (root: string): Promise<boolean> =>
  (await git(root, ['rev-parse', '--is-shallow-repository'])).trim() === 'true';

export async function headCommit(root: string): Promise<string | null> {
  try {
    return (await git(root, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'])).trim();
  } catch {
    return null;
  }
}

const splitNul = (output: string): string[] => output.split('\0').filter((entry) => entry !== '');

/** Files of the working tree (tracked or untracked, not ignored, not deleted) or of the index. */
export async function listFiles(root: string, source: 'worktree' | 'index'): Promise<ReadonlySet<string>> {
  if (source === 'index') {
    return new Set(splitNul(await git(root, ['ls-files', '-z', '--cached'])));
  }
  const present = splitNul(await git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']));
  const deleted = new Set(splitNul(await git(root, ['ls-files', '-z', '--deleted'])));
  return new Set(present.filter((path) => !deleted.has(path)));
}

export type IndexEntry = Readonly<{ path: string; object: string }>;

export async function listIndexEntries(root: string, directory: string): Promise<readonly IndexEntry[]> {
  return splitNul(await git(root, ['ls-files', '-z', '--cached', '--stage', '--', directory])).flatMap((line) => {
    const match = /^\d+ ([0-9a-f]+) \d\t(.+)$/su.exec(line);
    return match?.[1] === undefined || match[2] === undefined ? [] : [{ path: match[2], object: match[1] }];
  });
}

/**
 * Contents of `<revision>:<path>` or object names, read through one `git cat-file --batch` process;
 * `null` for a missing object.
 */
export async function readObjects(
  root: string,
  names: readonly string[],
): Promise<ReadonlyMap<string, Uint8Array | null>> {
  const contents = new Map<string, Uint8Array | null>();
  if (names.length === 0) {
    return contents;
  }
  const child = spawn('git', ['-C', root, 'cat-file', '--batch'], { env: GIT_ENVIRONMENT });
  const chunks: Buffer[] = [];
  const errors: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
  const exit = new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  child.stdin.end(`${names.join('\n')}\n`);
  const code = await exit;
  if (code !== 0) {
    throw new Error(`git cat-file --batch a échoué (${String(code)}) : ${Buffer.concat(errors).toString('utf8')}`);
  }
  const output = Buffer.concat(chunks);
  let offset = 0;
  for (const name of names) {
    const end = output.indexOf(0x0a, offset);
    const header = output.subarray(offset, end).toString('utf8');
    offset = end + 1;
    const size = /^[0-9a-f]+ \w+ (\d+)$/u.exec(header)?.[1];
    if (size === undefined) {
      contents.set(name, null);
    } else {
      contents.set(name, output.subarray(offset, offset + Number(size)));
      offset += Number(size) + 1;
    }
  }
  return contents;
}

export type CommitChange = Readonly<{ commit: string; authorDate: string; paths: readonly string[] }>;

/** Commits reachable from HEAD that touch `directory`, oldest first, with the paths they add, modify or delete. */
export async function directoryHistory(root: string, directory: string): Promise<readonly CommitChange[]> {
  const output = await git(root, [
    'log',
    '--reverse',
    '--topo-order',
    '--no-renames',
    '--no-color',
    '--no-show-signature',
    '--format=%x1e%H%x1f%aI',
    '--name-only',
    '-z',
    'HEAD',
    '--',
    directory,
  ]);
  return output
    .split('\x1e')
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [header = '', ...paths] = record.split(/[\n\0]/u).filter((part) => part !== '');
      const [commit = '', authorDate = ''] = header.split('\x1f');
      return { commit, authorDate, paths };
    });
}
