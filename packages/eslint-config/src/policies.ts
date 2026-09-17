import type { ConfinedModule, HermesGapName, Place } from '@huma/architecture';
import {
  CONFINED_MODULES,
  describeGap,
  HERMES_GAP_NAMES,
  HERMES_GAPS,
  IMPORTS,
  MODULES,
  PLACE_NAMES,
  PLACES,
} from '@huma/architecture';

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
  'place/platform-variant': 'une variante de plateforme ne vit que dans une place qui les permet, les primitives L0',
  'naming/file': 'un nom de fichier s’écrit en kebab-case, ou selon les conventions d’Expo Router pour une route',
  'naming/folder': 'un nom de dossier s’écrit en kebab-case, ou selon les conventions d’Expo Router pour une route',
  'spelling/unknown':
    'un identifiant s’écrit en mots anglais : un mot inconnu est une faute ou un mot à ajouter au vocabulaire',
  'glossary/term': 'un identifiant emploie le mot anglais que le glossaire retient pour ce terme du journal',
  'route/re-export': 'une route ne fait que réexporter : sa page, son ErrorBoundary et ses réglages vivent dans src',
  'route/error-boundary':
    'une route exporte un ErrorBoundary : sans lui, une erreur de rendu remonte jusqu’à la racine',
  'entry/re-export': 'une entrée publique ne fait que réexporter ce que les fichiers de son unité définissent',
  'style/inline': 'construire les styles avec createStyles : un objet de style en ligne échappe aux tokens brandés',
  'text/jsx': 'rendre le texte par Text et un DisplayText : un texte brut dans le JSX échappe au dictionnaire',
  'nav/js-tabs': 'composer les onglets avec NativeTabs : les onglets JS Expo Router ne rendent pas une barre native',
} as const satisfies Readonly<Record<`${string}/${string}`, string>>;

type WrittenPolicy = keyof typeof WRITTEN;

/** The policy of what a place imports, derived from the table of the architecture. */
export type ImportPolicy = `import/${Place}`;

/** The policy of the places a confined package may be imported from. */
export type ModulePolicy = `module/${ConfinedModule}`;

/** The policy of a JavaScript API Hermes lacks. */
export type HermesPolicy = `hermes/${HermesGapName}`;

export type PolicyId = WrittenPolicy | ImportPolicy | ModulePolicy | HermesPolicy;

export const importPolicy = (place: Place): ImportPolicy => `import/${place}`;

export const modulePolicy = (name: ConfinedModule): ModulePolicy => `module/${name}`;

export const hermesPolicy = (name: HermesGapName): HermesPolicy => `hermes/${name}`;

const isWrittenPolicy = (id: string): id is WrittenPolicy => Object.hasOwn(WRITTEN, id);

const WRITTEN_IDS = Object.keys(WRITTEN).filter(isWrittenPolicy);

export const POLICY_IDS: readonly PolicyId[] = [
  ...WRITTEN_IDS,
  ...PLACE_NAMES.map(importPolicy),
  ...CONFINED_MODULES.map(modulePolicy),
  ...HERMES_GAP_NAMES.map(hermesPolicy),
];

/** Rules whose message cannot be chosen, with the policy each one enforces. */
const RULE_POLICIES: Readonly<Record<string, PolicyId>> = {
  'boundaries/no-unknown-files': 'place/unknown-file',
  'check-file/filename-naming-convention': 'naming/file',
  'check-file/folder-naming-convention': 'naming/folder',
  'check-file/folder-match-with-fex': 'place/platform-variant',
};

/** What a place may import, as its message says it. */
function describeImports(place: Place): string {
  const own = PLACES[place].layout === 'routes' ? 'aucun autre fichier de route' : 'ses propres fichiers';
  const targets: readonly Place[] = IMPORTS[place].filter((target: Place) => target !== place);
  const entries = targets.length === 0 ? 'aucune autre place' : `l’entrée publique de : ${targets.join(', ')}`;
  const siblings = IMPORTS[place].some((target: Place) => target === place) ? ', et l’entrée de ses voisins' : '';
  return `${place} n’importe que ${own}${siblings} et ${entries}`;
}

/** Where a confined package may be imported, as its message says it. */
function describeModule(name: ConfinedModule): string {
  const { places, except }: Readonly<{ places: readonly Place[]; except: readonly string[] }> = MODULES[name];
  const open = except.length === 0 ? '' : `, sauf ${except.join(', ')}, ouvert à toutes`;
  return `${name} ne s’importe que depuis : ${places.join(', ')}${open}`;
}

/** The message of a policy, its id first: `[export/all] nommer chaque export…`. */
export function policyMessage(id: PolicyId): string {
  if (isWrittenPolicy(id)) {
    return `[${id}] ${WRITTEN[id]}`;
  }
  const place = PLACE_NAMES.find((candidate) => importPolicy(candidate) === id);
  if (place !== undefined) {
    return `[${id}] ${describeImports(place)}`;
  }
  const confined = CONFINED_MODULES.find((name) => modulePolicy(name) === id);
  if (confined !== undefined) {
    return `[${id}] ${describeModule(confined)}`;
  }
  const gap = HERMES_GAP_NAMES.find((name) => hermesPolicy(name) === id);
  if (gap === undefined) {
    throw new Error(`politique inconnue : ${id}`);
  }
  return `[${id}] ${describeGap(HERMES_GAPS[gap])} n’existe pas dans Hermes V1 (journal 0a, vérification 15)`;
}

const TAG = /\[(?<id>[a-z0-9-]+\/[a-z0-9-]+)\]/u;

/** The policy a lint message comes from, `null` when neither its rule nor its text names a known policy. */
export function policyOf(rule: string | null, message: string): PolicyId | null {
  if (rule === '@cspell/spellchecker') {
    return message.startsWith('Forbidden word') ? 'glossary/term' : 'spelling/unknown';
  }
  const byRule = rule === null ? undefined : RULE_POLICIES[rule];
  if (byRule !== undefined) {
    return byRule;
  }
  const id = TAG.exec(message)?.groups?.['id'];
  return POLICY_IDS.find((known) => known === id) ?? null;
}
