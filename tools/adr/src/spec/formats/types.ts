/** Sections of an ADR in MADR 4.0.0; a format gives their titles and their order. */
export const SECTION_KEYS = ['context', 'criteria', 'options', 'decision', 'prosAndCons', 'moreInformation'] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/** BCP 14 levels a rule can carry; `binding` levels need a proof before acceptance. */
export const RULE_LEVELS = ['must', 'mustNot', 'may'] as const;

export type RuleLevel = (typeof RULE_LEVELS)[number];

export const VALENCES = ['good', 'neutral', 'bad'] as const;

export type Valence = (typeof VALENCES)[number];

/**
 * Grammar of an ADR document in one format version. A decided ADR is checked forever against the version written in
 * its header, so a published version never changes: a stricter grammar is a new version.
 */
export type FormatSpec = Readonly<{
  version: number;
  /** In their required order; each section key exactly once. */
  sections: readonly Readonly<{ key: SectionKey; title: string }>[];
  /** Only subsection of the decision section. */
  consequences: string;
  keywords: Readonly<Record<RuleLevel, Readonly<{ label: string; forms: readonly string[]; binding: boolean }>>>;
  /** Capitalised words refused everywhere, compared without accents: modal words that blur a rule. */
  forbiddenWords: readonly string[];
  valences: Readonly<Record<Valence, string>>;
  labels: Readonly<{
    because: string;
    /** `because` before a vowel. */
    becauseElided: string;
    chosenOption: string;
    reevaluation: string;
    /** Between a bold label (`C1`, `R1`) and its text. */
    separator: string;
    criterionPrefix: string;
    rulePrefix: string;
  }>;
  title: Readonly<{
    maxCodePoints: number;
    forbiddenCharacters: readonly string[];
    finalPunctuation: readonly string[];
  }>;
  limits: Readonly<{ words: number; minOptions: number; maxSupersedes: number; headingDepth: number }>;
  markdown: Readonly<{ nodes: readonly string[]; fences: readonly string[] }>;
}>;
