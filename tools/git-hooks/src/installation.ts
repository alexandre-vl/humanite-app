import { constants } from 'node:fs';
import { access, chmod, lstat, mkdir, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { compareDiagnostics } from '@huma/kit/diagnostics';
import { readTextIfExists } from '@huma/kit/fs';
import type { GitRepository } from '@huma/kit/git';
import { commonDirectory, configEntries, worktreeRoots } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';

/** Expected content of each hook file, by hook name. */
export type ShimSet = ReadonlyMap<string, string>;

export type InstallationContext = Readonly<{
  repository: GitRepository;
  /** The repository seen from another worktree, without the variables of a git hook running in this one. */
  worktree: (root: string) => GitRepository;
}>;

/** Hooks of every worktree live in the common directory, where `core.hooksPath` is not set. */
const hooksDirectory = async (repository: GitRepository): Promise<string> =>
  join(await commonDirectory(repository), 'hooks');

/** Where findings point: the hooks directory as seen from the main worktree. */
const HOOKS_PATH = repoPath('.git/hooks');

const shown = (name: string): RepoPath => repoPath(`${HOOKS_PATH}/${name}`);

const isExecutable = async (path: string): Promise<boolean> =>
  access(path, constants.X_OK).then(
    () => true,
    () => false,
  );

/** Configuration of every worktree that sends git elsewhere for hooks or pulls in configuration that could. */
async function redirections(context: InstallationContext): Promise<readonly Diagnostic<GitHookCode>[]> {
  const findings = new Map<string, Diagnostic<GitHookCode>>();
  for (const root of await worktreeRoots(context.repository)) {
    const repository = root === context.repository.root ? context.repository : context.worktree(root);
    for (const entry of await configEntries(repository, String.raw`^core\.hookspath$`)) {
      const found = gitHookFinding('git/hooks-path', HOOKS_PATH, {
        value: entry.value,
        scope: entry.scope,
        origin: entry.origin,
      });
      findings.set(found.message, found);
    }
    for (const entry of await configEntries(repository, String.raw`^include(if)?\.`)) {
      if (entry.scope === 'local' || entry.scope === 'worktree') {
        const found = gitHookFinding('git/config-include', HOOKS_PATH, {
          key: entry.key,
          scope: entry.scope,
          origin: entry.origin,
        });
        findings.set(found.message, found);
      }
    }
  }
  return [...findings.values()];
}

/**
 * The shims are installed as generated: a real hooks directory in the common directory, each shim present, identical
 * and executable, no other executable hook, and no configuration of any worktree that redirects or hides hooks.
 */
export async function checkInstallation(
  context: InstallationContext,
  shims: ShimSet,
): Promise<readonly Diagnostic<GitHookCode>[]> {
  const directory = await hooksDirectory(context.repository);
  const findings: Diagnostic<GitHookCode>[] = [];
  if ((await lstat(directory).catch(() => null))?.isSymbolicLink() === true) {
    findings.push(gitHookFinding('git/hooks-directory-link', HOOKS_PATH, {}));
  }
  for (const [hook, expected] of shims) {
    const path = join(directory, hook);
    const content = await readTextIfExists(path).catch(() => '');
    if (content === null) {
      findings.push(gitHookFinding('git/hook-missing', shown(hook), { hook }));
    } else if (content !== expected) {
      findings.push(gitHookFinding('git/hook-modified', shown(hook), { hook }));
    } else if (!(await isExecutable(path))) {
      findings.push(gitHookFinding('git/hook-not-executable', shown(hook), { hook }));
    }
  }
  for (const name of (await readdir(directory).catch(() => [])).toSorted(compareText)) {
    if (!shims.has(name) && !name.endsWith('.sample') && (await isExecutable(join(directory, name)))) {
      findings.push(gitHookFinding('git/hook-unexpected', shown(name), { name }));
    }
  }
  return [...findings, ...(await redirections(context))].toSorted(compareDiagnostics);
}

export type InstallOutcome =
  | Readonly<{ kind: 'installed'; hooks: readonly string[] }>
  | Readonly<{ kind: 'refused'; findings: readonly Diagnostic<GitHookCode>[] }>;

/**
 * Writes each shim atomically, executable, into the hooks directory of the common directory. Refuses while a
 * configuration redirects hooks or the directory is a link: installing would then change nothing git runs.
 */
export async function installShims(context: InstallationContext, shims: ShimSet): Promise<InstallOutcome> {
  const directory = await hooksDirectory(context.repository);
  const blocking = [
    ...((await lstat(directory).catch(() => null))?.isSymbolicLink() === true
      ? [gitHookFinding('git/hooks-directory-link', HOOKS_PATH, {})]
      : []),
    ...(await redirections(context)).filter((finding) => finding.code === 'git/hooks-path'),
  ];
  if (blocking.length > 0) {
    return { kind: 'refused', findings: blocking };
  }
  await mkdir(directory, { recursive: true });
  for (const [hook, content] of shims) {
    const temporary = join(directory, `.${hook}.${String(process.pid)}`);
    await writeFile(temporary, content, 'utf8');
    await chmod(temporary, 0o755);
    await rename(temporary, join(directory, hook));
  }
  return { kind: 'installed', hooks: [...shims.keys()] };
}
