import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { errnoCode } from '@huma/kit/errors';
import type { GitRepository } from '@huma/kit/git';
import { readObjects, statusEntries } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { keysOf } from '@huma/kit/records';
import type { EmulatorCode } from '../checks.ts';
import { emulatorFinding } from '../checks.ts';
import { ROOT_SOURCE } from '../sources.ts';

/** The files of the root guard, with the mode root installs each with: scripts run, the library and table are read. */
export const ROOT_FILES = {
  'arm.sh': 0o755,
  'guard.sh': 0o755,
  'disarm.sh': 0o755,
  'lib.sh': 0o644,
  'tracked.tsv': 0o644,
} as const;

export type RootFile = keyof typeof ROOT_FILES;

export const ROOT_FILE_NAMES: readonly RootFile[] = keysOf(ROOT_FILES);

const rootSource = (file: RootFile): RepoPath => repoPath(`${ROOT_SOURCE}/${file}`);

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Modes a path of the guard must not have: writable by its group or by others. */
const WRITABLE_BY_OTHERS = 0o022;

const octal = (mode: number): string => (mode & 0o7777).toString(8);

/**
 * The problem of one path the guard runs from, `null` when only root can change it: root owns it, neither its group
 * nor others can write it, and it is no symbolic link another user could point elsewhere.
 */
async function pathProblem(path: string): Promise<string | null> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) {
      return 'lien symbolique';
    }
    if (stats.uid !== 0) {
      return `appartient à l’uid ${String(stats.uid)}`;
    }
    return (stats.mode & WRITABLE_BY_OTHERS) === 0
      ? null
      : `mode ${octal(stats.mode)}, modifiable par d’autres que root`;
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return 'absent';
    }
    throw error;
  }
}

/** Every directory from the root down to `directory`, `directory` included. */
function ancestry(directory: string): readonly string[] {
  const parent = dirname(directory);
  return parent === directory ? [directory] : [...ancestry(parent), directory];
}

/** The installed file's state against the committed one, `null` when it is the same file with the right mode. */
async function fileProblem(installed: string, committed: Uint8Array | null, mode: number): Promise<string | null> {
  if (committed === null) {
    return 'absent du dernier commit';
  }
  let bytes: Buffer;
  try {
    bytes = await readFile(installed);
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return 'non installé';
    }
    throw error;
  }
  if (sha256(bytes) !== sha256(committed)) {
    return `installé ${sha256(bytes).slice(0, 12)}, différent du dernier commit ${sha256(committed).slice(0, 12)}`;
  }
  const stats = await lstat(installed);
  return (stats.mode & 0o7777) === mode && stats.gid === 0
    ? null
    : `mode ${octal(stats.mode)} et groupe ${String(stats.gid)}, attendu ${octal(mode)} et groupe 0`;
}

/**
 * Whether root runs the committed guard: every file installed in `installDirectory` equals its version in `HEAD`, the
 * working tree changes none of them, and only root can change the path they are run from.
 */
export async function checkInstall(
  repository: GitRepository,
  installDirectory: string,
): Promise<readonly Diagnostic<EmulatorCode>[]> {
  const findings: Diagnostic<EmulatorCode>[] = [];
  const changed = new Set((await statusEntries(repository)).map((entry) => entry.path));
  const committed = await readObjects(
    repository,
    ROOT_FILE_NAMES.map((file) => `HEAD:${rootSource(file)}`),
  );
  for (const file of ROOT_FILE_NAMES) {
    const source = rootSource(file);
    if (changed.has(source)) {
      findings.push(emulatorFinding('emulator/guard-uncommitted', source, {}));
    }
    const problem = await fileProblem(
      join(installDirectory, file),
      committed.get(`HEAD:${source}`) ?? null,
      ROOT_FILES[file],
    );
    if (problem !== null) {
      findings.push(emulatorFinding('emulator/guard-install', source, { file, state: problem }));
    }
  }
  for (const path of [...ancestry(installDirectory), ...ROOT_FILE_NAMES.map((file) => join(installDirectory, file))]) {
    const problem = await pathProblem(path);
    if (problem !== null && problem !== 'absent') {
      findings.push(emulatorFinding('emulator/guard-path', ROOT_SOURCE, { path, state: problem }));
    }
  }
  return findings;
}

/** The SHA-256 of each file installed in `installDirectory`, `null` for a missing one. */
export async function installedHashes(installDirectory: string): Promise<ReadonlyMap<RootFile, string | null>> {
  const hashes = new Map<RootFile, string | null>();
  for (const file of ROOT_FILE_NAMES) {
    try {
      hashes.set(file, sha256(await readFile(join(installDirectory, file))));
    } catch (error) {
      if (errnoCode(error) !== 'ENOENT') {
        throw error;
      }
      hashes.set(file, null);
    }
  }
  return hashes;
}
