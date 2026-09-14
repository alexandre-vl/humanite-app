/**
 * Single source of the ADR format: the checker, the index, the skeleton written by `adr:new` and the agent guard
 * all read these values. ADR-0000 states the invariants; the values in force are rendered in `docs/adr/README.md`.
 */

export const ADR_DIRECTORY = 'docs/adr';
export const INDEX_FILE = 'docs/adr/README.md';
export const FORMAT = 1;
export const TIME_ZONE = 'Europe/Paris';

/** Statuses written in an ADR file. `accepted` and `rejected` are decisions: the file never changes afterwards. */
export const STATUSES = ['proposed', 'accepted', 'rejected'] as const;
export type Status = (typeof STATUSES)[number];

export const TRANSITIONS = {
  proposed: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
} as const satisfies Readonly<Record<Status, readonly Status[]>>;

export type DecidedStatus = (typeof TRANSITIONS)['proposed'][number];

export const isDecided = (status: Status): status is DecidedStatus => status !== 'proposed';

/** Why a change deserves an ADR, in canonical order. */
export const SIGNIFICANCES = ['dependency', 'guarded-config', 'boundary', 'data-format', 'reversal-cost'] as const;
export type Significance = (typeof SIGNIFICANCES)[number];

/** `automatic` criteria are detected from the diff (phase 0c), `review` ones by reading the change. */
export const SIGNIFICANCE = {
  dependency: { label: 'ajoute, retire ou remplace une dépendance', detection: 'automatic' },
  'guarded-config': {
    label: 'modifie une configuration gardée : TypeScript, ESLint, Prettier, catalog pnpm, hooks, .claude, tools',
    detection: 'automatic',
  },
  boundary: {
    label: 'crée ou modifie une frontière : couche, package, champs exports ou imports',
    detection: 'automatic',
  },
  'data-format': { label: 'change un contrat de données ou un format persistant', detection: 'automatic' },
  'reversal-cost': { label: 'coûte plus d’une journée à défaire', detection: 'review' },
} as const satisfies Readonly<Record<Significance, Readonly<{ label: string; detection: 'automatic' | 'review' }>>>;

/** Sections of an ADR, in order: the French translation of the MADR 4.0.0 template, every section required. */
export const SECTIONS = {
  context: 'Contexte et problème',
  criteria: 'Critères de décision',
  options: 'Options étudiées',
  decision: 'Décision',
  prosAndCons: 'Avantages et inconvénients des options',
  moreInformation: 'Informations complémentaires',
} as const;

export const CONSEQUENCES_TITLE = 'Conséquences';

export type SectionKey = keyof typeof SECTIONS;

export const SECTION_ORDER = [
  'context',
  'criteria',
  'options',
  'decision',
  'prosAndCons',
  'moreInformation',
] as const satisfies readonly SectionKey[];

/** BCP 14 keywords (RFC 2119, RFC 8174) in French, meaningful only in capitals, allowed only inside rules. */
export const RULE_KEYWORDS = {
  'NE DOIVENT PAS': 'must-not',
  'NE DOIT PAS': 'must-not',
  DOIVENT: 'must',
  DOIT: 'must',
  PEUVENT: 'may',
  PEUT: 'may',
} as const satisfies Readonly<Record<string, RuleLevel>>;

export type RuleLevel = 'must' | 'must-not' | 'may';

export const BINDING_LEVELS = ['must', 'must-not'] as const satisfies readonly RuleLevel[];

/** Capitalised modal words that would weaken or blur a rule; a rule states `DOIT`, `NE DOIT PAS` or `PEUT`. */
export const FORBIDDEN_KEYWORDS = [
  'NE DEVRAIENT PAS',
  'NE DEVRAIT PAS',
  'NE DEVRONT PAS',
  'NE DEVRA PAS',
  'NE PEUVENT PAS',
  'NE PEUT PAS',
  'NON RECOMMANDÉES',
  'NON RECOMMANDÉS',
  'NON RECOMMANDÉE',
  'NON RECOMMANDÉ',
  'DEVRAIENT',
  'DEVRAIT',
  'DEVRONT',
  'DEVRA',
  'EXIGÉES',
  'EXIGÉS',
  'EXIGÉE',
  'EXIGÉ',
  'EXIGE',
  'OBLIGATOIRES',
  'OBLIGATOIRE',
  'RECOMMANDÉES',
  'RECOMMANDÉS',
  'RECOMMANDÉE',
  'RECOMMANDÉ',
  'FACULTATIVES',
  'FACULTATIFS',
  'FACULTATIVE',
  'FACULTATIF',
  'OPTIONNELLES',
  'OPTIONNELS',
  'OPTIONNELLE',
  'OPTIONNEL',
  'INTERDITES',
  'INTERDITS',
  'INTERDITE',
  'INTERDIT',
] as const;

/** Every argument and consequence starts with `<valence>, parce que`, as MADR's “Good, because …”. */
export const VALENCES = {
  good: 'Bien',
  neutral: 'Neutre',
  bad: 'Mauvais',
} as const;

export type Valence = keyof typeof VALENCES;

export const VALENCE_ORDER = ['good', 'neutral', 'bad'] as const satisfies readonly Valence[];

export const LABELS = {
  /** `parce que` elides to `parce qu’` before a vowel: both spellings are accepted. */
  because: 'parce que',
  chosenOption: 'Option retenue',
  reevaluation: 'Réévaluation',
  /** Between a bold label (`C1`, `R1`) and its text. */
  labelSeparator: ' — ',
} as const;

export const LIMITS = {
  words: 900,
  titleCodePoints: 60,
  minOptions: 2,
} as const;
