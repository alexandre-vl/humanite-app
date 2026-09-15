import { basename } from 'node:path';
import { ADR_DIRECTORY } from '@huma/adr/layout';
import { AGENT_SESSION_VARIABLES } from '@huma/kit/session';
import type { SimpleCommand } from './shell/commands.ts';
import { argv, hasOpaqueProgram, programName } from './shell/commands.ts';
import type { Word } from './shell/words.ts';
import { isKnown } from './shell/words.ts';

/** A family of commands an agent may not run, how to recognise one, and the permission rules that also refuse it. */
type CommandRule = Readonly<{
  id: string;
  reason: string;
  /** `permissions.deny` entries of Claude Code: a first filter, the hook being the real check. */
  permissions: readonly string[];
  matches: (command: SimpleCommand) => boolean;
}>;

/** Files an agent may not write, with its file tools or through a shell: a directory and all below it, or one file. */
export type PathRule = Readonly<{ id: string; reason: string; path: string; kind: 'directory' | 'file' }>;

/** A package script or entry file reserved to the human decision maker. */
export type HumanOnlyCommand = Readonly<{ script: string; entry: string }>;

export type AgentPolicy = Readonly<{
  commands: readonly CommandRule[];
  paths: readonly PathRule[];
  /** Tools whose input carries a shell command in `command`. */
  shellTools: readonly string[];
  /** Tools whose input carries a file path to write. */
  fileTools: readonly string[];
  /** Tools that run code the guard cannot read as commands: refused when they mention a sensitive token. */
  codeTools: readonly string[];
  /** Lowercase tokens whose mention in the code of a `codeTools` call refuses it. */
  sensitiveTokens: readonly string[];
}>;

export const CLAUDE_SETTINGS_PATH = '.claude/settings.json';

export const CLAUDE_LOCAL_SETTINGS_PATH = '.claude/settings.local.json';

/** Names git reads in its directory to run code or pick up configuration: githooks(5) and the config files. */
export const GIT_SENSITIVE_NAMES = [
  'config',
  'config.worktree',
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'pre-receive',
  'update',
  'proc-receive',
  'post-receive',
  'post-update',
  'reference-transaction',
  'push-to-checkout',
  'pre-auto-gc',
  'post-rewrite',
  'sendemail-validate',
  'fsmonitor-watchman',
  'p4-changelist',
  'p4-prepare-changelist',
  'p4-post-changelist',
  'p4-pre-submit',
  'post-index-change',
] as const;

const texts = (words: readonly Word[]): readonly string[] => words.map((word) => word.text);

/** Git global options followed by a value, and the forms that name a repository or a work tree elsewhere. */
const GIT_VALUE_OPTIONS = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--config-env',
  '--exec-path',
]);

const GIT_LOCATION_OPTIONS = ['--git-dir', '--work-tree'];

/** Variables that make git run the hooks, and the checks they start, of another repository or work tree. */
const GIT_LOCATION_VARIABLES = new Set(['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']);

/** Git subcommands that run hooks and accept `--no-verify`. */
const VERIFIED_SUBCOMMANDS = new Set(['commit', 'merge', 'am', 'rebase', 'push', 'cherry-pick', 'revert', 'pull']);

/** Short options of `git commit` that take a value: the letters after them are not options. */
const COMMIT_VALUE_LETTERS = new Set(['m', 'F', 'C', 'c', 't', 'u']);

/** Subcommands that write commits, refs or history without running any hook. */
const HOOKLESS_SUBCOMMANDS = new Set([
  'commit-tree',
  'update-ref',
  'fast-import',
  'replace',
  'filter-branch',
  'filter-repo',
]);

type GitCall = Readonly<{ globals: readonly string[]; subcommand: Word; args: readonly string[] }>;

function gitCall(command: SimpleCommand): GitCall | null {
  const { words } = command;
  if (programName(command) !== 'git') {
    return null;
  }
  let index = 1;
  const globals: string[] = [];
  while (index < words.length && (words[index]?.text ?? '').startsWith('-')) {
    const option = words[index]?.text ?? '';
    globals.push(option);
    if (GIT_VALUE_OPTIONS.has(option)) {
      globals.push(words[index + 1]?.text ?? '');
      index += 2;
    } else {
      index += 1;
    }
  }
  const subcommand = words[index];
  return subcommand === undefined ? null : { globals, subcommand, args: texts(words.slice(index + 1)) };
}

const mentionsHooksPath = (text: string): boolean => /hookspath/iu.test(text);

const definesAlias = (text: string): boolean => /^alias\./iu.test(text);

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
    if (arg.startsWith('--') || !arg.startsWith('-') || arg.length === 1) {
      continue;
    }
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
  return false;
}

/** `--no-verify` or an unambiguous abbreviation that git accepts. */
const isNoVerify = (arg: string): boolean => arg.length >= '--no-veri'.length && '--no-verify'.startsWith(arg);

const skipsHooks = (subcommand: string, args: readonly string[]): boolean =>
  args.some(isNoVerify) || (subcommand === 'commit' && skipsCommitHooks(args));

const GIT_HOOKS_BYPASS: CommandRule = {
  id: 'git-hooks-bypass',
  reason:
    'Les hooks git du dépôt ne se contournent pas : ni --no-verify, ni core.hooksPath ou alias, ni dépôt ou arbre désigné ailleurs, ni plomberie qui écrit sans hooks.',
  permissions: ['Bash(git commit --no-verify *)', 'Bash(git commit -n *)', 'Bash(git push --no-verify *)'],
  matches: (command) => {
    const call = gitCall(command);
    if (call === null) {
      return false;
    }
    const subcommand = call.subcommand.text;
    const verified = VERIFIED_SUBCOMMANDS.has(subcommand) || !isKnown(call.subcommand);
    const relocated =
      command.assignments.some((assignment) => GIT_LOCATION_VARIABLES.has(assignment.name)) ||
      call.globals.some((option) =>
        GIT_LOCATION_OPTIONS.some((name) => option === name || option.startsWith(`${name}=`)),
      );
    const readsConfig = call.args.some((arg) => /^(?:--get|--list$|-l$)/u.test(arg));
    return (
      command.assignments.some((assignment) => assignment.name.startsWith('GIT_CONFIG')) ||
      call.globals.some((option) => mentionsHooksPath(option) || definesAlias(option)) ||
      HOOKLESS_SUBCOMMANDS.has(subcommand) ||
      (subcommand === 'config' &&
        !readsConfig &&
        call.args.some((arg) => mentionsHooksPath(arg) || definesAlias(arg))) ||
      (verified && relocated) ||
      (verified && skipsHooks(subcommand, call.args))
    );
  },
};

const PRIVILEGED = new Set(['sudo', 'sudoedit', 'doas', 'pkexec', 'su', 'run0']);

/**
 * A command whose program only the run itself would name: a substitution, a variable the line never sets. The guard
 * cannot say what it launches, so no rule can clear it.
 */
const OPAQUE_PROGRAM: CommandRule = {
  id: 'opaque-program',
  reason:
    'Le programme de cette commande ne se lit pas dans la ligne : écrire son nom en clair, pour que la garde sache ce qu’elle laisse passer.',
  permissions: [],
  matches: hasOpaqueProgram,
};

const PRIVILEGE_ESCALATION: CommandRule = {
  id: 'privilege-escalation',
  reason: 'Les commandes root sont lancées par l’utilisateur lui-même, jamais par un agent.',
  permissions: ['Bash(sudo *)', 'Bash(doas *)', 'Bash(pkexec *)', 'Bash(su *)', 'Bash(run0 *)'],
  matches: (command) => PRIVILEGED.has(programName(command)),
};

/** What the policy protects of the Android emulator: words that name its container or its image. */
export type EmulatorTarget = Readonly<{ container: string; markers: readonly string[] }>;

/** docker subcommands that create, start, enter, change or remove a container. */
const CONTAINER_CHANGES = new Set([
  'attach',
  'commit',
  'cp',
  'create',
  'exec',
  'kill',
  'pause',
  'rename',
  'restart',
  'rm',
  'run',
  'start',
  'stop',
  'unpause',
  'update',
]);

/** docker global options followed by a value. */
const DOCKER_VALUE_OPTIONS = new Set(['-H', '--host', '-c', '--context', '--config', '-l', '--log-level']);

/** The subcommand of a docker call and its arguments, a `container` management command read as its subcommand. */
function dockerCall(command: SimpleCommand): Readonly<{ subcommand: string; args: readonly string[] }> | null {
  const words = argv(command);
  if (basename(words[0] ?? '') !== 'docker') {
    return null;
  }
  let index = 1;
  while ((words[index] ?? '').startsWith('-')) {
    index += DOCKER_VALUE_OPTIONS.has(words[index] ?? '') ? 2 : 1;
  }
  const managed = words[index] === 'container' ? 1 : 0;
  const subcommand = words[index + managed];
  return subcommand === undefined ? null : { subcommand, args: words.slice(index + managed + 1) };
}

/**
 * Refuses docker calls that start, enter, change or remove the emulator's container, or run its image: Android in a
 * privileged container writes the host kernel, and only `emulator:up` and `emulator:down` wait for the root guard.
 */
function emulatorRule(target: EmulatorTarget): CommandRule {
  return {
    id: 'emulator-direct',
    reason:
      'Le conteneur de l’émulateur ne se lance, ne s’ouvre et ne s’arrête que par pnpm emulator:up et pnpm emulator:down, qui attendent le garde root.',
    permissions: ['exec', 'kill', 'restart', 'rm', 'start', 'stop'].map(
      (subcommand) => `Bash(docker ${subcommand} ${target.container}*)`,
    ),
    matches: (command) => {
      const call = dockerCall(command);
      return (
        call !== null &&
        CONTAINER_CHANGES.has(call.subcommand) &&
        call.args.some((arg) => target.markers.some((marker) => arg.includes(marker)))
      );
    },
  };
}

const isSessionVariable = (name: string): boolean => AGENT_SESSION_VARIABLES.some((variable) => variable === name);

const SESSION_MASKING: CommandRule = {
  id: 'session-masking',
  reason: 'Une session d’agent ne masque pas les variables qui la signalent aux outils du dépôt.',
  permissions: AGENT_SESSION_VARIABLES.map((name) => `Bash(unset ${name}*)`),
  matches: (command) => {
    const name = programName(command);
    const args = argv(command).slice(1);
    const named = (arg: string): boolean => isSessionVariable(arg.replace(/^--unset=/u, '').split('=')[0] ?? '');
    return (
      command.assignments.some((assignment) => isSessionVariable(assignment.name)) ||
      (name === 'unset' && args.some(named)) ||
      (name === 'env' && args.some((arg) => named(arg) || ['-i', '--ignore-environment', '-'].includes(arg))) ||
      (name === 'export' && args.includes('-n') && args.some(named)) ||
      ((name === 'declare' || name === 'typeset') && args.includes('+x') && args.some(named))
    );
  },
};

const PACKAGE_RUNNERS = new Set(['pnpm', 'npm', 'yarn', 'corepack', 'bun']);

const CODE_RUNNERS = new Set(['node', 'tsx', 'bun', 'deno']);

const EVAL_OPTIONS = new Set(['-e', '--eval', '-p', '--print']);

/**
 * Refuses the scripts reserved to the human decision maker: run by script name, by entry file (directly or through
 * a code runner), or named in code evaluated inline. Reading or searching those files stays allowed.
 */
function humanOnlyRule(commands: readonly HumanOnlyCommand[]): CommandRule {
  const scripts = new Set(commands.map((command) => command.script));
  const entries = new Set(commands.map((command) => basename(command.entry)));
  const namesOne = (text: string): boolean => [...scripts, ...entries].some((token) => text.includes(token));
  return {
    id: 'human-only-command',
    reason: `${commands.map((command) => command.script).join(', ')} revient au décideur humain : il le lance dans son propre terminal.`,
    permissions: commands.flatMap((command) => [
      `Bash(pnpm ${command.script} *)`,
      `Bash(pnpm run ${command.script} *)`,
    ]),
    matches: (command) => {
      const [program = '', ...args] = argv(command);
      const name = basename(program);
      return (
        (PACKAGE_RUNNERS.has(name) && args.some((arg) => scripts.has(arg))) ||
        entries.has(name) ||
        (CODE_RUNNERS.has(name) &&
          args.some(
            (arg, index) => entries.has(basename(arg)) || (EVAL_OPTIONS.has(args[index - 1] ?? '') && namesOne(arg)),
          ))
      );
    },
  };
}

const PROTECTED_PATHS: readonly PathRule[] = [
  { id: 'git-directory', reason: 'Le dossier .git ne s’écrit qu’à travers git.', path: '.git', kind: 'directory' },
  {
    id: 'claude-settings',
    reason: 'Les réglages Claude Code du dépôt sont générés par pnpm gen depuis leur source typée.',
    path: CLAUDE_SETTINGS_PATH,
    kind: 'file',
  },
  {
    id: 'claude-local-settings',
    reason: 'Des réglages locaux pourraient désactiver les hooks du dépôt.',
    path: CLAUDE_LOCAL_SETTINGS_PATH,
    kind: 'file',
  },
];

export const pathPermission = (rule: PathRule): string =>
  rule.kind === 'directory' ? `Edit(/${rule.path}/**)` : `Edit(/${rule.path})`;

/** Whether a repository path lies inside the rule: the file itself, or anything below the directory. */
export const coversPath = (rule: PathRule, repositoryPath: string): boolean =>
  repositoryPath === rule.path || (rule.kind === 'directory' && repositoryPath.startsWith(`${rule.path}/`));

/** Tokens a code tool may not mention: what the command and path rules protect, in lowercase. */
function sensitiveTokens(humanOnly: readonly HumanOnlyCommand[]): readonly string[] {
  return [
    ...humanOnly.flatMap((command) => [command.script, basename(command.entry)]),
    ...PROTECTED_PATHS.map((rule) => (rule.kind === 'directory' ? `${rule.path}/` : rule.path)),
    ADR_DIRECTORY,
    ...AGENT_SESSION_VARIABLES,
    '--no-veri',
    'hookspath',
    'git_config',
    'commit-tree',
    'update-ref',
    'sudo',
  ].map((token) => token.toLowerCase());
}

export function agentPolicy(humanOnly: readonly HumanOnlyCommand[], emulator: EmulatorTarget): AgentPolicy {
  return {
    commands: [
      PRIVILEGE_ESCALATION,
      OPAQUE_PROGRAM,
      GIT_HOOKS_BYPASS,
      SESSION_MASKING,
      humanOnlyRule(humanOnly),
      emulatorRule(emulator),
    ],
    paths: PROTECTED_PATHS,
    shellTools: ['Bash', 'Monitor', 'PowerShell'],
    fileTools: ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'],
    codeTools: ['REPL'],
    sensitiveTokens: sensitiveTokens(humanOnly),
  };
}
