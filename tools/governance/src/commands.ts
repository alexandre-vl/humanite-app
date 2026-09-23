import { shellLine } from '@huma/kit/cli';
import { repoPath } from '@huma/kit/paths';
import { isOneOf, keysOf } from '@huma/kit/records';
import { compareText } from '@huma/kit/text';

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
const SCRIPT_AUDIENCES = ['everyone', 'human'] as const satisfies readonly Audience[];

type ScriptAudience = (typeof SCRIPT_AUDIENCES)[number];

/** A TypeScript entry of the repository, run by the Node that `devEngines` pins. */
type NodeProgram = Readonly<{ kind: 'node'; entry: string }>;

/** A program pnpm linked into `node_modules/.bin`. */
type BinaryProgram = Readonly<{ kind: 'binary'; name: string }>;

/**
 * A command of the workspace. Everyone's commands may run any program; the others are reached without going through
 * a package script — a git hook shim, a Claude Code hook, the guard that recognises what a human alone may run — and
 * each of those has to name the very file it runs, which only a TypeScript entry gives.
 */
export type CommandSpec =
  | Readonly<{
      audience: ScriptAudience;
      program: NodeProgram | BinaryProgram;
      arguments: readonly string[];
      summary: string;
    }>
  | Readonly<{
      audience: Exclude<Audience, ScriptAudience>;
      program: NodeProgram;
      arguments: readonly string[];
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

const cli = (name: string): NodeProgram => ({ kind: 'node', entry: `tools/governance/src/cli/${name}.ts` });

const binary = (name: string): BinaryProgram => ({ kind: 'binary', name });

export const COMMANDS = {
  'adr:check': {
    program: cli('adr-check'),
    arguments: [],
    audience: 'everyone',
    summary: 'vérifie les ADR, leurs liens et leur historique',
  },
  'adr:decide': {
    program: cli('adr-decide'),
    arguments: [],
    audience: 'human',
    summary: 'accepte ou rejette un ADR proposé',
  },
  'adr:new': {
    program: cli('adr-new'),
    arguments: [],
    audience: 'everyone',
    summary: 'crée un ADR proposé au dernier format',
  },
  'capture:read': {
    program: cli('capture-read'),
    arguments: [],
    audience: 'everyone',
    summary: 'lit une session réseau captée et en écrit les réponses du journal, sans laisser passer de secret',
  },
  'adr:status': {
    program: cli('adr-status'),
    arguments: [],
    audience: 'everyone',
    summary: 'liste les ADR, leur statut et leurs preuves',
  },
  'agent:guard': {
    program: cli('agent-guard'),
    arguments: [],
    audience: 'claude-hook',
    summary: 'refuse les appels d’outils interdits aux agents',
  },
  'agent:stop': {
    program: cli('agent-stop'),
    arguments: [],
    audience: 'claude-hook',
    summary: 'lance pnpm verify avant qu’un agent s’arrête',
  },
  'deps:check': {
    program: cli('deps-check'),
    arguments: [],
    audience: 'everyone',
    summary: 'vérifie manifestes, catalog, références TypeScript et lockfile',
  },
  'emulator:build': {
    program: cli('emulator-build'),
    arguments: [],
    audience: 'everyone',
    summary: 'génère android/ puis confie à un service utilisateur l’attente d’un hôte calme et le build natif',
  },
  'emulator:down': {
    program: cli('emulator-down'),
    arguments: [],
    audience: 'everyone',
    summary: 'supprime le conteneur de l’émulateur et attend que le garde root ait restauré l’hôte',
  },
  'perf:check': {
    program: cli('perf-check'),
    arguments: [],
    audience: 'everyone',
    summary: 'juge une session de mesures prise sur un téléphone contre les budgets de performance',
  },
  'emulator:e2e': {
    program: cli('emulator-e2e'),
    arguments: [],
    audience: 'everyone',
    summary: 'lance les parcours Maestro de l’app sur l’émulateur',
  },
  'emulator:gradle': {
    program: cli('emulator-gradle'),
    arguments: [],
    audience: 'everyone',
    summary: 'attend un hôte calme, puis construit l’APK de l’émulateur avec Gradle dans une scope plafonnée',
  },
  'emulator:install': {
    program: cli('emulator-install'),
    arguments: [],
    audience: 'everyone',
    summary: 'installe le dev client construit sur l’émulateur',
  },
  'emulator:metro': {
    program: cli('emulator-metro'),
    arguments: [],
    audience: 'everyone',
    summary: 'sert l’app au dev client avec Metro, sur la boucle locale',
  },
  'emulator:status': {
    program: cli('emulator-status'),
    arguments: [],
    audience: 'everyone',
    summary: 'vérifie sans rien changer ce que l’émulateur Android exige, et affiche les commandes root qui manquent',
  },
  'emulator:up': {
    program: cli('emulator-up'),
    arguments: [],
    audience: 'everyone',
    summary: 'démarre l’émulateur Android et vérifie chaque étape, restauration de l’hôte comprise',
  },
  'expo:types': {
    program: cli('expo-types'),
    arguments: [],
    audience: 'everyone',
    summary: 'génère les types de routes de chaque app Expo, sans qu’Expo réécrive un fichier suivi',
  },
  format: {
    program: cli('format'),
    arguments: [],
    audience: 'everyone',
    summary: 'formate les fichiers du dépôt',
  },
  'format:check': {
    program: cli('format'),
    arguments: ['--check'],
    audience: 'everyone',
    summary: 'vérifie le formatage des fichiers du dépôt',
  },
  gen: {
    program: cli('gen'),
    arguments: [],
    audience: 'everyone',
    summary: 'régénère les fichiers dérivés',
  },
  'gen:check': {
    program: cli('gen'),
    arguments: ['--check'],
    audience: 'everyone',
    summary: 'vérifie que les fichiers dérivés sont à jour',
  },
  'git:hook': {
    program: cli('git-hook'),
    arguments: [],
    audience: 'git-hook',
    summary: 'exécute un hook git : index complet, pnpm verify, message et citations d’ADR',
  },
  'hooks:check': {
    program: cli('hooks-check'),
    arguments: [],
    audience: 'everyone',
    summary: 'vérifie les hooks git et Claude Code installés, et l’historique des messages',
  },
  'hooks:install': {
    program: cli('hooks-install'),
    arguments: [],
    audience: 'everyone',
    summary: 'installe les hooks git du dépôt',
  },
  knip: {
    program: binary('knip'),
    arguments: ['--no-progress', '--no-config-hints'],
    audience: 'everyone',
    summary: 'cherche les fichiers, exports et dépendances que rien n’emploie',
  },
  lint: {
    program: cli('lint'),
    arguments: [],
    audience: 'everyone',
    summary: 'ESLint sur les fichiers du dépôt, sans cache ni suppressions : aucun message toléré',
  },
  'structure:check': {
    program: cli('structure-check'),
    arguments: [],
    audience: 'everyone',
    summary:
      'vérifie la structure Feature-Sliced de chaque app avec Steiger, y cherche les cycles d’imports, et le corpus dans sa build de service',
  },
  test: {
    program: binary('vitest'),
    arguments: ['run'],
    audience: 'everyone',
    summary: 'tests et fixtures des outils',
  },
  'test:app': {
    program: cli('test-app'),
    arguments: [],
    audience: 'everyone',
    summary: 'tests jest-expo et RNTL de l’app',
  },
  typecheck: {
    program: binary('tsc'),
    arguments: ['--build'],
    audience: 'everyone',
    summary: 'vérification des types de chaque projet',
  },
  verify: {
    program: cli('verify'),
    arguments: [],
    audience: 'everyone',
    summary: 'tous les contrôles du dépôt, dans l’ordre',
  },
} as const satisfies Readonly<Record<string, CommandSpec>>;

export type CommandName = keyof typeof COMMANDS;

/** The commands run from a TypeScript entry: the only ones a hook, a shim or the agent guard can name. */
export type NodeCommandName = {
  [Name in CommandName]: (typeof COMMANDS)[Name]['program'] extends NodeProgram ? Name : never;
}[CommandName];

/** One step of `pnpm verify`: what it runs, what a hang looks like, and what it takes on an index. */
export type VerifyEntry = Readonly<{
  step: CommandName;
  /**
   * Time beyond which the step counts as hung and is stopped, generous for a loaded shared host: a check that hangs,
   * as typescript-eslint once did on a circular re-export, then fails instead of holding a commit or an agent.
   */
  budgetMs: number;
  /** Arguments it takes when verify judges the index about to be committed rather than the working tree. */
  staged?: readonly string[];
  /**
   * Globs of files this step cannot read. A run told which paths a commit changes skips the step when every one of
   * them matches one of these.
   *
   * It says what a step is blind to and not what it judges, and the difference is which way a mistake falls. A list
   * of what a step reads has to be exhaustive to be safe: one input left out of it, and the step is skipped over a
   * change it would have caught. A list of what it ignores is safe by default — a step that declares none always
   * runs, a path nobody thought of always runs everything, and each entry is a single claim that can be checked on
   * its own rather than a claim about everything else.
   */
  blindTo?: readonly string[];
}>;

/**
 * Prose under `docs/`, which eight of the twelve steps below cannot read. Each of them was checked rather than
 * assumed: ESLint declares `files` of JavaScript and TypeScript only (`packages/eslint-config/src/index.ts`), jest
 * roots at `apps/mobile/src`, vitest covers `packages` and `tools` — and of the tests there, every mention of `docs/`
 * is a synthetic path in a fixture, none reads the folder — knip names no `docs` project, Steiger walks the app's
 * `src`, `deps:check` reads manifests, `expo:types` reads routes and `tsc` reads the TypeScript projects.
 *
 * It is markdown and not all of `docs/`, because `docs/glossary.ts` lives there and the lint configuration imports
 * it: a glob spanning the whole folder would make a change to the paper's own vocabulary skip the check that spends
 * it.
 */
const DOCUMENTATION = ['docs/**/*.md'] as const;

/**
 * The steps of `pnpm verify`, cheapest first: the run stops at the first failure. One row per step, so a step can
 * neither lose its budget nor keep index arguments no step of the plan claims.
 *
 * Four rows carry no `blindTo` and so always run. `format:check` because Prettier formats markdown as it formats
 * everything else; `gen:check` because `docs/adr/README.md` is derived from the ADRs themselves; `hooks:check`
 * because it reads the message of the commit being written; and `adr:check` because the documents are its subject.
 */
export const VERIFY_PLAN = [
  { step: 'gen:check', budgetMs: 120_000 },
  { step: 'hooks:check', budgetMs: 120_000, staged: ['--staged'] },
  { step: 'deps:check', budgetMs: 120_000, blindTo: DOCUMENTATION },
  { step: 'format:check', budgetMs: 180_000 },
  { step: 'expo:types', budgetMs: 120_000, blindTo: DOCUMENTATION },
  { step: 'structure:check', budgetMs: 180_000, blindTo: DOCUMENTATION },
  { step: 'knip', budgetMs: 180_000, blindTo: DOCUMENTATION },
  { step: 'lint', budgetMs: 600_000, blindTo: DOCUMENTATION },
  { step: 'typecheck', budgetMs: 600_000, blindTo: DOCUMENTATION },
  { step: 'test', budgetMs: 900_000, blindTo: DOCUMENTATION },
  { step: 'test:app', budgetMs: 600_000, blindTo: DOCUMENTATION },
  { step: 'adr:check', budgetMs: 300_000, staged: ['--source', 'index'] },
] as const satisfies readonly VerifyEntry[];

export type VerifyStep = (typeof VERIFY_PLAN)[number]['step'];

/** Every command, by name, in one order: the manifest, the guides and knip all derive from this list. */
export const COMMAND_NAMES: readonly CommandName[] = keysOf(COMMANDS).toSorted(compareText);

/** Whether `pnpm <name>` reaches the command, which decides the scripts of the root manifest. */
export const isScriptCommand = (
  spec: CommandSpec,
): spec is Extract<CommandSpec, Readonly<{ audience: ScriptAudience }>> => isOneOf(SCRIPT_AUDIENCES, spec.audience);

/** Program and arguments, as a shell or a child process takes them. */
const commandArgv = (spec: CommandSpec): readonly [string, ...string[]] =>
  spec.program.kind === 'node'
    ? ['node', spec.program.entry, ...spec.arguments]
    : [spec.program.name, ...spec.arguments];

/** The command as a line for `package.json` scripts or a shell. */
export const commandLine = (spec: CommandSpec): string => shellLine(commandArgv(spec));

/** The TypeScript file a command runs; only a command the table declares as a node entry can be asked for one. */
export const nodeEntry = (name: NodeCommandName): string => COMMANDS[name].program.entry;

/** Entries of the commands no package script reaches: without them knip would report their files as unused. */
export const HOOK_ENTRIES: readonly string[] = COMMAND_NAMES.flatMap((name) => {
  const spec: CommandSpec = COMMANDS[name];
  return isScriptCommand(spec) ? [] : [spec.program.entry];
});
