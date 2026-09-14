/**
 * Every command of the workspace, once: `package.json` scripts, the steps of `pnpm verify`, the agent hooks and the
 * commands reserved to the human decision maker are all derived from this table.
 */

/** `everyone` and `human` commands become package scripts; `hook` commands are run by Claude Code only. */
export type Audience = 'everyone' | 'human' | 'hook';

export type CommandSpec = Readonly<{
  /** Program and arguments; `node` is the runtime pinned by `devEngines`. */
  argv: readonly [string, ...string[]];
  audience: Audience;
  summary: string;
}>;

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
    audience: 'hook',
    summary: 'refuse les appels d’outils interdits aux agents',
  },
  'agent:stop': {
    argv: ['node', cli('agent-stop')],
    audience: 'hook',
    summary: 'lance pnpm verify avant qu’un agent s’arrête',
  },
  format: { argv: ['prettier', '--write', '.'], audience: 'everyone', summary: 'formate le dépôt' },
  'format:check': { argv: ['prettier', '--check', '.'], audience: 'everyone', summary: 'vérifie le formatage' },
  gen: { argv: ['node', cli('gen')], audience: 'everyone', summary: 'régénère les fichiers dérivés' },
  'gen:check': {
    argv: ['node', cli('gen'), '--check'],
    audience: 'everyone',
    summary: 'vérifie que les fichiers dérivés sont à jour',
  },
  lint: {
    argv: ['eslint', '--flag', 'unstable_native_nodejs_ts_config', '--max-warnings', '0', '.'],
    audience: 'everyone',
    summary: 'lint sans cache, aucun avertissement toléré',
  },
  test: { argv: ['vitest', 'run'], audience: 'everyone', summary: 'tests et fixtures des outils' },
  typecheck: { argv: ['tsc', '--build'], audience: 'everyone', summary: 'vérification des types de chaque projet' },
  verify: { argv: ['node', cli('verify')], audience: 'everyone', summary: 'tous les contrôles du dépôt, dans l’ordre' },
} as const satisfies Readonly<Record<string, CommandSpec>>;

export type CommandName = keyof typeof COMMANDS;

/** Steps of `pnpm verify`, cheapest first: the run stops at the first failure. */
export const VERIFY_STEPS = [
  'gen:check',
  'format:check',
  'lint',
  'typecheck',
  'test',
  'adr:check',
] as const satisfies readonly CommandName[];

export const COMMAND_NAMES: readonly CommandName[] = Object.keys(COMMANDS).filter((name): name is CommandName =>
  Object.hasOwn(COMMANDS, name),
);

const SAFE_WORD = /^[\w@%+=:,./-]+$/u;

const quote = (word: string): string => (SAFE_WORD.test(word) ? word : `'${word.replaceAll("'", String.raw`'\''`)}'`);

/** The command as a line for `package.json` scripts or a shell. */
export const commandLine = (spec: CommandSpec): string => spec.argv.map(quote).join(' ');

/** The TypeScript file a `node` command runs, `null` for other programs. */
export const entryFile = (spec: CommandSpec): string | null =>
  spec.argv[0] === 'node' ? (spec.argv[1] ?? null) : null;
