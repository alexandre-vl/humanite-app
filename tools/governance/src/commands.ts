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
  'emulator:build': {
    argv: ['node', cli('emulator-build')],
    audience: 'everyone',
    summary: 'génère android/ puis confie à un service utilisateur l’attente d’un hôte calme et le build natif',
  },
  'emulator:down': {
    argv: ['node', cli('emulator-down')],
    audience: 'everyone',
    summary: 'supprime le conteneur de l’émulateur et attend que le garde root ait restauré l’hôte',
  },
  'emulator:e2e': {
    argv: ['node', cli('emulator-e2e')],
    audience: 'everyone',
    summary: 'lance les parcours Maestro de l’app sur l’émulateur',
  },
  'emulator:gradle': {
    argv: ['node', cli('emulator-gradle')],
    audience: 'everyone',
    summary: 'attend un hôte calme, puis construit l’APK de l’émulateur avec Gradle dans une scope plafonnée',
  },
  'emulator:install': {
    argv: ['node', cli('emulator-install')],
    audience: 'everyone',
    summary: 'installe le dev client construit sur l’émulateur',
  },
  'emulator:metro': {
    argv: ['node', cli('emulator-metro')],
    audience: 'everyone',
    summary: 'sert l’app au dev client avec Metro, sur la boucle locale',
  },
  'emulator:status': {
    argv: ['node', cli('emulator-status')],
    audience: 'everyone',
    summary: 'vérifie sans rien changer ce que l’émulateur Android exige, et affiche les commandes root qui manquent',
  },
  'emulator:up': {
    argv: ['node', cli('emulator-up')],
    audience: 'everyone',
    summary: 'démarre l’émulateur Android et vérifie chaque étape, restauration de l’hôte comprise',
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
  knip: {
    argv: ['knip', '--no-progress', '--no-config-hints'],
    audience: 'everyone',
    summary: 'cherche les fichiers, exports et dépendances que rien n’emploie',
  },
  lint: {
    argv: ['node', cli('lint')],
    audience: 'everyone',
    summary: 'ESLint sur les fichiers du dépôt, sans cache ni suppressions : aucun message toléré',
  },
  'structure:check': {
    argv: ['node', cli('structure-check')],
    audience: 'everyone',
    summary: 'vérifie la structure Feature-Sliced de chaque app avec Steiger et y cherche les cycles d’imports',
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
  'structure:check',
  'knip',
  'lint',
  'typecheck',
  'test',
  'adr:check',
] as const satisfies readonly CommandName[];

export type VerifyStep = (typeof VERIFY_STEPS)[number];

/**
 * Time each step of `pnpm verify` may take before it is stopped, generous for a loaded shared host: a check that hangs,
 * as typescript-eslint once did on a circular re-export, then fails instead of holding a commit or an agent.
 */
export const VERIFY_BUDGETS_MS = {
  'gen:check': 120_000,
  'hooks:check': 120_000,
  'deps:check': 120_000,
  'format:check': 180_000,
  'expo:types': 120_000,
  'structure:check': 180_000,
  knip: 180_000,
  lint: 600_000,
  typecheck: 600_000,
  test: 900_000,
  'adr:check': 300_000,
} as const satisfies Readonly<Record<VerifyStep, number>>;

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
