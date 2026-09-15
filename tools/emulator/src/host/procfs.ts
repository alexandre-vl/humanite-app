import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { errnoCode } from '@huma/kit/errors';
import { startHelper } from '@huma/kit/process';
import { compareText } from '@huma/kit/text';

/** Owner, group and mode of an entry, written as the guard writes them: `220 0 1000`, the mode in octal. */
export type Attributes = string;

export const attributesOf = (stats: Readonly<{ mode: number; uid: number; gid: number }>): Attributes =>
  `${(stats.mode & 0o7777).toString(8)} ${String(stats.uid)} ${String(stats.gid)}`;

/** Entries of `/proc` no sample reads: one directory per process, and the views of the reader's own namespaces. */
const PER_PROCESS = /^(?:\d+|self|thread-self|net|sys)$/u;

const INNER_PROCESS_TIMEOUT_MS = 5_000;

const INNER_PROCESS_POLL_MS = 20;

/** The pid, as the host sees it, of the process `unshare --fork` started for helper `pid`. */
async function innerProcess(pid: number): Promise<number> {
  const deadline = Date.now() + INNER_PROCESS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const children = await readFile(`/proc/${String(pid)}/task/${String(pid)}/children`, 'utf8').catch(() => '');
    const [child] = children.trim().split(' ');
    if (child !== undefined && child !== '') {
      return Number(child);
    }
    await sleep(INNER_PROCESS_POLL_MS);
  }
  throw new Error('unshare n’a démarré aucun processus : espaces de noms utilisateur indisponibles ?');
}

/**
 * Runs `body` on a procfs mounted for the occasion, without root, and read from the host: a helper holds a new user,
 * PID and mount namespace, and the host reaches its `/proc` through `/proc/<pid>/root`, where owners and groups keep
 * their host ids.
 *
 * The host's own `/proc` would not do: procfs keeps each inode with the attributes it had when it was first looked up,
 * while chown and chmod from any mount, a container's included, change the kernel-wide entry that new inodes copy.
 */
export async function withFreshProcfs<Result>(body: (procfs: string) => Promise<Result>): Promise<Result> {
  await using helper = await startHelper(
    'unshare',
    ['--user', '--map-current-user', '--pid', '--fork', '--kill-child', '--mount-proc', '--', 'sleep', 'infinity'],
    { cwd: '/', killGraceMs: 500 },
  );
  // Awaited here: the helper, and the procfs it holds, must outlive the body.
  return await body(`/proc/${String(await innerProcess(helper.pid))}/root/proc`);
}

/**
 * The attributes of every entry of the procfs at `procfs` but the per-process ones, keyed by their path under `/proc`;
 * symbolic links are left out, and so are directories the reader may not list.
 */
export async function procfsAttributes(procfs: string): Promise<ReadonlyMap<string, Attributes>> {
  const attributes = new Map<string, Attributes>();
  const visit = async (relative: string): Promise<void> => {
    let names: readonly string[];
    try {
      names = await readdir(join(procfs, relative));
    } catch (error) {
      if (errnoCode(error) === 'EACCES' || errnoCode(error) === 'ENOENT') {
        return;
      }
      throw error;
    }
    for (const name of names.toSorted(compareText)) {
      if (relative === '' && PER_PROCESS.test(name)) {
        continue;
      }
      const path = relative === '' ? name : `${relative}/${name}`;
      const stats = await lstat(join(procfs, path)).catch(() => null);
      if (stats === null || stats.isSymbolicLink()) {
        continue;
      }
      attributes.set(`/proc/${path}`, attributesOf(stats));
      if (stats.isDirectory()) {
        await visit(path);
      }
    }
  };
  await visit('');
  return attributes;
}
