import { isOneOf } from '@huma/kit/records';

/** The git hooks the repository installs, each a shim that runs the hook entry of the workspace. */
export const GIT_HOOK_NAMES = [
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'applypatch-msg',
] as const;

export type GitHookName = (typeof GIT_HOOK_NAMES)[number];

export const isGitHookName = (value: string): value is GitHookName => isOneOf(GIT_HOOK_NAMES, value);

/** What a shim runs, relative to the root of the worktree git runs it in, and the command that installs it. */
export type ShimCommand = Readonly<{ node: string; entry: string; installer: string }>;

/**
 * A POSIX shell shim for `hook`: it runs the entry with the pinned Node from the worktree root, where git runs hooks,
 * and refuses the git command when the worktree has no installed dependencies.
 */
export const renderShim = (hook: GitHookName, command: ShimCommand): string =>
  [
    '#!/bin/sh',
    `# Généré par ${command.installer} : pnpm verify compare ce fichier octet par octet.`,
    `if [ -x ${command.node} ] && [ -f ${command.entry} ]; then`,
    `  exec ${command.node} ${command.entry} ${hook} "$@"`,
    'fi',
    `printf '%s\\n' "Hook git ${hook} refusé : ${command.node} ou ${command.entry} introuvable dans $PWD. Lancer pnpm install dans ce worktree." >&2`,
    'exit 1',
    '',
  ].join('\n');

/** Every shim of the repository, by hook name. */
export const renderShims = (command: ShimCommand): ReadonlyMap<GitHookName, string> =>
  new Map(GIT_HOOK_NAMES.map((hook) => [hook, renderShim(hook, command)]));
