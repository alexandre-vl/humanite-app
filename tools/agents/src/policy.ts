import { AGENT_SESSION_VARIABLES } from '@huma/kit/session';
import type { SimpleCommand } from './shell.ts';

/** A family of commands an agent may not run, how to recognise one, and the permission rules that also refuse it. */
export type CommandRule = Readonly<{
  id: string;
  reason: string;
  /** `permissions.deny` entries of Claude Code: a first filter, the hook being the real check. */
  permissions: readonly string[];
  matches: (command: SimpleCommand) => boolean;
}>;

/** Files an agent may not edit with its file tools, as repository-relative prefixes or exact paths. */
export type PathRule = Readonly<{ id: string; reason: string; path: string; kind: 'directory' | 'file' }>;

/** A package script or entry file reserved to the human decision maker. */
export type HumanOnlyCommand = Readonly<{ script: string; entry: string }>;

export type AgentPolicy = Readonly<{
  commands: readonly CommandRule[];
  paths: readonly PathRule[];
  /** Tools whose input carries a shell command. */
  shellTools: readonly string[];
  /** Tools whose input carries a file path to write. */
  fileTools: readonly string[];
}>;

const GIT_VALUE_OPTIONS = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--config-env',
  '--exec-path',
]);

/** Git subcommands that run hooks and accept `--no-verify`. */
const VERIFIED_SUBCOMMANDS = new Set(['commit', 'merge', 'am', 'rebase', 'push', 'cherry-pick', 'revert', 'pull']);

/** Short options of `git commit` that take a value: the letters after them are not options. */
const COMMIT_VALUE_LETTERS = new Set(['m', 'F', 'C', 'c', 't', 'u']);

/** Plumbing that writes commits or refs without running any hook. */
const HOOKLESS_SUBCOMMANDS = new Set(['commit-tree', 'update-ref', 'fast-import']);

function gitCall(
  words: readonly string[],
): Readonly<{ globals: readonly string[]; subcommand: string; args: readonly string[] }> | null {
  if (words[0] !== 'git') {
    return null;
  }
  let index = 1;
  const globals: string[] = [];
  while (index < words.length && (words[index] ?? '').startsWith('-')) {
    const option = words[index] ?? '';
    globals.push(option);
    if (GIT_VALUE_OPTIONS.has(option)) {
      globals.push(words[index + 1] ?? '');
      index += 2;
    } else {
      index += 1;
    }
  }
  const subcommand = words[index];
  return subcommand === undefined ? null : { globals, subcommand, args: words.slice(index + 1) };
}

const mentionsHooksPath = (word: string): boolean => /hookspath/iu.test(word);

function skipsCommitHooks(args: readonly string[]): boolean {
  let skipValue = false;
  for (const arg of args) {
    if (skipValue) {
      skipValue = false;
      continue;
    }
    if (arg === '--') {
      return false;
    }
    if (arg.startsWith('--')) {
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1) {
      for (const [position, letter] of Array.from(arg.slice(1)).entries()) {
        if (letter === 'n') {
          return true;
        }
        if (COMMIT_VALUE_LETTERS.has(letter)) {
          skipValue = position === arg.length - 2;
          break;
        }
      }
    }
  }
  return false;
}

/** `--no-verify` or an unambiguous abbreviation that git accepts. */
const isNoVerify = (arg: string): boolean => arg.length >= '--no-veri'.length && '--no-verify'.startsWith(arg);

export const GIT_HOOKS_BYPASS: CommandRule = {
  id: 'git-hooks-bypass',
  reason:
    'Les hooks git du dépôt ne se contournent pas : ni --no-verify, ni core.hooksPath, ni plomberie qui écrit un commit sans eux, ni écriture dans .git/hooks.',
  permissions: ['Bash(git commit --no-verify *)', 'Bash(git commit -n *)', 'Bash(git push --no-verify *)'],
  matches: ({ assignments, words }) => {
    if (words.some((word) => word.includes('.git/hooks'))) {
      return true;
    }
    const call = gitCall(words);
    if (call === null) {
      return false;
    }
    if (
      assignments.some((assignment) => assignment.startsWith('GIT_CONFIG_')) ||
      call.globals.some(mentionsHooksPath) ||
      HOOKLESS_SUBCOMMANDS.has(call.subcommand)
    ) {
      return true;
    }
    if (call.subcommand === 'config') {
      return call.args.some(mentionsHooksPath);
    }
    if (!VERIFIED_SUBCOMMANDS.has(call.subcommand)) {
      return false;
    }
    return call.args.some(isNoVerify) || (call.subcommand === 'commit' && skipsCommitHooks(call.args));
  },
};

export const PRIVILEGE_ESCALATION: CommandRule = {
  id: 'privilege-escalation',
  reason: 'Les commandes root sont lancées par l’utilisateur lui-même, jamais par un agent.',
  permissions: ['Bash(sudo *)', 'Bash(doas *)', 'Bash(pkexec *)'],
  matches: ({ words }) => ['sudo', 'doas', 'pkexec', 'su'].includes(words[0] ?? ''),
};

export const SESSION_MASKING: CommandRule = {
  id: 'session-masking',
  reason: 'Une session d’agent ne masque pas les variables qui la signalent aux outils du dépôt.',
  permissions: AGENT_SESSION_VARIABLES.map((name) => `Bash(unset ${name}*)`),
  matches: ({ assignments, words }) => {
    const touches = (word: string): boolean =>
      AGENT_SESSION_VARIABLES.some((name) => word === name || word.startsWith(`${name}=`));
    return (
      assignments.some(touches) ||
      (words[0] === 'unset' && words.slice(1).some(touches)) ||
      (words[0] === 'env' && words.slice(1).some(touches))
    );
  },
};

const PACKAGE_RUNNERS = new Set(['pnpm', 'npm', 'yarn', 'corepack']);

/** Refuses the scripts reserved to the human decision maker, by script name or by entry file. */
export function humanOnlyRule(commands: readonly HumanOnlyCommand[]): CommandRule {
  const scripts = new Set(commands.map((command) => command.script));
  return {
    id: 'human-only-command',
    reason: 'Cette commande revient au décideur humain : il la lance dans son propre terminal.',
    permissions: commands.flatMap((command) => [
      `Bash(pnpm ${command.script} *)`,
      `Bash(pnpm run ${command.script} *)`,
    ]),
    matches: ({ words }) =>
      (PACKAGE_RUNNERS.has(words[0] ?? '') && words.slice(1).some((word) => scripts.has(word))) ||
      words.some((word) => commands.some((command) => word === command.entry || word.endsWith(`/${command.entry}`))),
  };
}

export const PROTECTED_PATHS: readonly PathRule[] = [
  { id: 'git-directory', reason: 'Le dossier .git ne s’écrit qu’à travers git.', path: '.git', kind: 'directory' },
  {
    id: 'claude-settings',
    reason: 'Les réglages Claude Code du dépôt sont générés par pnpm gen depuis leur source typée.',
    path: '.claude/settings.json',
    kind: 'file',
  },
  {
    id: 'claude-local-settings',
    reason: 'Des réglages locaux pourraient désactiver les hooks du dépôt.',
    path: '.claude/settings.local.json',
    kind: 'file',
  },
];

export const pathPermission = (rule: PathRule): string =>
  rule.kind === 'directory' ? `Edit(/${rule.path}/**)` : `Edit(/${rule.path})`;

export const coversPath = (rule: PathRule, repositoryPath: string): boolean =>
  rule.kind === 'directory'
    ? repositoryPath === rule.path || repositoryPath.startsWith(`${rule.path}/`)
    : repositoryPath === rule.path;

export function agentPolicy(humanOnly: readonly HumanOnlyCommand[]): AgentPolicy {
  return {
    commands: [GIT_HOOKS_BYPASS, PRIVILEGE_ESCALATION, SESSION_MASKING, humanOnlyRule(humanOnly)],
    paths: PROTECTED_PATHS,
    shellTools: ['Bash', 'Monitor', 'PowerShell'],
    fileTools: ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'],
  };
}
