import type { Place } from '@huma/architecture';
import { IMPORTS, PLACE_NAMES, PLACES } from '@huma/architecture';

/**
 * The restrictions the workspace writes itself, by policy id. Each message carries its id between brackets, which is how
 * a guardrail fixture tells which policy a finding comes from; each policy has a fixture that makes it fire.
 */
const WRITTEN = {
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
  'place/unknown-file': 'ce fichier n’appartient à aucune place de l’architecture',
} as const satisfies Readonly<Record<`${string}/${string}`, string>>;

type WrittenPolicy = keyof typeof WRITTEN;

/** The policy of what a place imports, derived from the table of the architecture. */
export type ImportPolicy = `import/${Place}`;

export type PolicyId = WrittenPolicy | ImportPolicy;

export const importPolicy = (place: Place): ImportPolicy => `import/${place}`;

const isWrittenPolicy = (id: string): id is WrittenPolicy => Object.hasOwn(WRITTEN, id);

const WRITTEN_IDS = Object.keys(WRITTEN).filter(isWrittenPolicy);

export const POLICY_IDS: readonly PolicyId[] = [...WRITTEN_IDS, ...PLACE_NAMES.map(importPolicy)];

/** Rules whose message cannot be chosen, with the policy each one enforces. */
const RULE_POLICIES: Readonly<Record<string, PolicyId>> = {
  'boundaries/no-unknown-files': 'place/unknown-file',
};

/** What a place may import, as its message says it. */
function describeImports(place: Place): string {
  const own = PLACES[place].layout === 'routes' ? 'aucun autre fichier de route' : 'ses propres fichiers';
  const targets: readonly Place[] = IMPORTS[place].filter((target: Place) => target !== place);
  const entries = targets.length === 0 ? 'aucune autre place' : `l’entrée publique de : ${targets.join(', ')}`;
  const siblings = IMPORTS[place].some((target: Place) => target === place) ? ', et l’entrée de ses voisins' : '';
  return `${place} n’importe que ${own}${siblings} et ${entries}`;
}

/** The message of a policy, its id first: `[export/all] nommer chaque export…`. */
export function policyMessage(id: PolicyId): string {
  if (isWrittenPolicy(id)) {
    return `[${id}] ${WRITTEN[id]}`;
  }
  const place = PLACE_NAMES.find((candidate) => importPolicy(candidate) === id);
  if (place === undefined) {
    throw new Error(`politique sans place : ${id}`);
  }
  return `[${id}] ${describeImports(place)}`;
}

const TAG = /\[(?<id>[a-z0-9-]+\/[a-z0-9-]+)\]/u;

/** The policy a lint message comes from, `null` when neither its rule nor its text names a known policy. */
export function policyOf(rule: string | null, message: string): PolicyId | null {
  const byRule = rule === null ? undefined : RULE_POLICIES[rule];
  if (byRule !== undefined) {
    return byRule;
  }
  const id = TAG.exec(message)?.groups?.['id'];
  return POLICY_IDS.find((known) => known === id) ?? null;
}
