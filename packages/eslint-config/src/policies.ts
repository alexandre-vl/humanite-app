/**
 * The restrictions the workspace writes itself, by policy id. Each message carries its id between brackets, which is how
 * a guardrail fixture tells which policy a finding comes from; each policy has a fixture that makes it fire.
 */
export const POLICIES = {
  'export/all': 'nommer chaque export : export * cache ce qu’un module expose',
  'node/decorator': 'Node efface les types sans rien transformer : un décorateur échoue à l’exécution',
  'node/accessor': 'Node efface les types sans rien transformer : un accesseur accessor échoue à l’exécution',
  'node/import-js': 'importer le fichier .ts : Node exécute les sources TypeScript',
  'node/export-js': 'réexporter depuis le fichier .ts : Node exécute les sources TypeScript',
  'node/dynamic-import-js': 'importer dynamiquement le fichier .ts : Node exécute les sources TypeScript',
  'node/process-exit': 'fixer process.exitCode : process.exit coupe les sorties en attente',
  'test/describe-only': 'un describe focalisé cache le reste de la suite',
  'test/it-only': 'un it focalisé cache le reste de la suite',
  'test/test-only': 'un test focalisé cache le reste de la suite',
} as const satisfies Readonly<Record<`${string}/${string}`, string>>;

export type PolicyId = keyof typeof POLICIES;

export const POLICY_IDS = Object.keys(POLICIES).filter((id): id is PolicyId => Object.hasOwn(POLICIES, id));

/** The message of a policy, its id first: `[export/all] nommer chaque export…`. */
export const policyMessage = (id: PolicyId): string => `[${id}] ${POLICIES[id]}`;

const TAG = /\[(?<id>[a-z0-9-]+\/[a-z0-9-]+)\]/u;

/** The policy a lint message comes from, `null` when it carries no known policy id. */
export function policyOf(message: string): PolicyId | null {
  const id = TAG.exec(message)?.groups?.['id'];
  return POLICY_IDS.find((known) => known === id) ?? null;
}
