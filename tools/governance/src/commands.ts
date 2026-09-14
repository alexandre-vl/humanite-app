import { shellLine } from '@huma/kit/cli';
import { repoPath } from '@huma/kit/paths';
import { keysOf } from '@huma/kit/records';

/**
 * Every command of the workspace, once: `package.json` scripts, the steps of `pnpm verify`, the agent hooks and the
 * commands reserved to the human decision maker are all derived from this table.
 */

/**
 * `everyone` and `human` commands become package scripts; `claude-hook` commands are run by Claude Code and
 * `git-hook` commands by the git hook shims, never by hand.
 */
export type Audience = 'everyone' | 'human' | 'claude-hook' | 'git-hook';

/** Audiences whose commands are package scripts. */
export const SCRIPT_AUDIENCES: readonly Audience[] = ['everyone', 'human'];

export type CommandSpec = Readonly<{
  /** Program and arguments; `node` is the runtime pinned by `devEngines`. */
  argv: readonly [string, ...string[]];
  audience: Audience;
  summary: string;
}>;

/** Where the table of commands lives, as guides name it. */
export const COMMANDS_PATH = repoPath('tools/governance/src/commands.ts');

/** The ESLint flat configuration of the repository, which editors, the ESLint CLI and `pnpm lint` all load. */
export const ESLINT_CONFIG_FILE = repoPath('eslint.config.ts');

/** Where pnpm links the binaries of the workspace, `node` pinned by `devEngines` included. */
export const BIN_DIRECTORY = 'node_modules/.bin';

/** The pinned Node, for commands that run outside a package script: agent hooks and git hooks. */
export const PINNED_NODE = `${BIN_DIRECTORY}/node`;

const cli = (name: string): string => `tools/governance/src/cli/${name}.ts`;

export const COMMANDS = {
  'adr:check': {
    argv: ['node', cli('adr-check')],
    audience: 'everyone',
    summary: 'vérifie les ADR, leurs liens et leur historique',
  },
  'adr:decide': { argv: ['node', cli('adr-decide')], audience: 'human', summary: 'accepte ou rejette un ADR proposé' },
  'adr:new': { argv: ['node', cli('adr-new')], audience: 'everyone', summary: 'crée un ADR proposé au dernier format' },
  'adr:status': {
    argv: ['node', cli('adr-status')],
    audience: 'everyone',
    summary: 'liste les ADR, leur statut et leurs preuves',
  },
  'agent:guard': {
    argv: ['node', cli('agent-guard')],
    audience: 'claude-hook',
    summary: 'refuse les appels d’outils interdits aux agents',
  },
  'agent:stop': {
    argv: ['node', cli('agent-stop')],
    audience: 'claude-hook',
    summary: 'lance pnpm verify avant qu’un agent s’arrête',
  },
  'deps:check': {
    argv: ['node', cli('deps-check')],
    audience: 'everyone',
    summary: 'vérifie manifestes, catalog, références TypeScript et lockfile',
  },
  'expo:types': {
    argv: ['node', cli('expo-types')],
    audience: 'everyone',
    summary: 'génère les types de routes de chaque app Expo, sans qu’Expo réécrive un fichier suivi',
  },
  format: { argv: ['node', cli('format')], audience: 'everyone', summary: 'formate les fichiers du dépôt' },
  'format:check': {
    argv: ['node', cli('format'), '--check'],
    audience: 'everyone',
    summary: 'vérifie le formatage des fichiers du dépôt',
  },
  gen: { argv: ['node', cli('gen')], audience: 'everyone', summary: 'régénère les fichiers dérivés' },
  'gen:check': {
    argv: ['node', cli('gen'), '--check'],
    audience: 'everyone',
    summary: 'vérifie que les fichiers dérivés sont à jour',
  },
  'git:hook': {
    argv: ['node', cli('git-hook')],
    audience: 'git-hook',
    summary: 'exécute un hook git : index complet, pnpm verify, message et citations d’ADR',
  },
  'hooks:check': {
    argv: ['node', cli('hooks-check')],
    audience: 'everyone',
    summary: 'vérifie les hooks git et Claude Code installés, et l’historique des messages',
  },
  'hooks:install': {
    argv: ['node', cli('hooks-install')],
    audience: 'everyone',
    summary: 'installe les hooks git du dépôt',
  },
  lint: {
    argv: ['node', cli('lint')],
    audience: 'everyone',
    summary: 'ESLint sur les fichiers du dépôt, sans cache ni suppressions : aucun message toléré',
  },
  test: { argv: ['vitest', 'run'], audience: 'everyone', summary: 'tests et fixtures des outils' },
  typecheck: { argv: ['tsc', '--build'], audience: 'everyone', summary: 'vérification des types de chaque projet' },
  verify: { argv: ['node', cli('verify')], audience: 'everyone', summary: 'tous les contrôles du dépôt, dans l’ordre' },
} as const satisfies Readonly<Record<string, CommandSpec>>;

export type CommandName = keyof typeof COMMANDS;

/** Steps of `pnpm verify`, cheapest first: the run stops at the first failure. */
export const VERIFY_STEPS = [
  'gen:check',
  'hooks:check',
  'deps:check',
  'format:check',
  'expo:types',
  'lint',
  'typecheck',
  'test',
  'adr:check',
] as const satisfies readonly CommandName[];

/** Arguments a step takes when verify checks the index about to be committed, from pre-commit. */
export const STAGED_ARGUMENTS: Readonly<Partial<Record<CommandName, readonly string[]>>> = {
  'adr:check': ['--source', 'index'],
  'hooks:check': ['--staged'],
};

export const COMMAND_NAMES: readonly CommandName[] = keysOf(COMMANDS);

/** The command as a line for `package.json` scripts or a shell. */
export const commandLine = (spec: CommandSpec): string => shellLine(spec.argv);

/** The TypeScript file a `node` command runs, `null` for other programs. */
export const entryFile = (spec: CommandSpec): string | null =>
  spec.argv[0] === 'node' ? (spec.argv[1] ?? null) : null;

/** The TypeScript file of a command that must run with `node`: hooks start it without a package script. */
export function nodeEntry(name: CommandName): string {
  const entry = entryFile(COMMANDS[name]);
  if (entry === null) {
    throw new Error(`${name} n’est pas une commande node`);
  }
  return entry;
}
