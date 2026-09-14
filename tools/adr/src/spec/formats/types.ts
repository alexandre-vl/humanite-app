/** Sections of an ADR in MADR 4.0.0; a format gives their titles and their order. */
export const SECTION_KEYS = ['context', 'criteria', 'options', 'decision', 'prosAndCons', 'moreInformation'] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/** BCP 14 levels a rule can carry; `binding` levels need a proof before acceptance. */
export const RULE_LEVELS = ['must', 'mustNot', 'may'] as const;

export type RuleLevel = (typeof RULE_LEVELS)[number];

export const VALENCES = ['good', 'neutral', 'bad'] as const;

export type Valence = (typeof VALENCES)[number];

/** The spellings of a keyword by grammatical number: the singular, then the plural. */
export type KeywordForms = readonly [singular: string, plural: string];

/**
 * Grammar of an ADR document in one format version. A decided ADR is checked forever against the version written in
 * its header: a grammar that would refuse a decided ADR is a new version, which every proposed ADR then follows.
 */
export type FormatSpec = Readonly<{
  version: number;
  /** In their required order; each section key exactly once. */
  sections: readonly Readonly<{ key: SectionKey; title: string }>[];
  /** Only subsection of the decision section. */
  consequences: string;
  keywords: Readonly<Record<RuleLevel, Readonly<{ label: string; forms: KeywordForms; binding: boolean }>>>;
  /**
   * Words that turn a keyword of `must` or `may` into a negation when they stand right before or after it, whatever
   * their case or accents: a rule states a prohibition only with the exact forms of `mustNot`.
   */
  negation: Readonly<{ before: readonly string[]; after: readonly string[] }>;
  /** Capitalised words refused everywhere, compared without accents: modal words that blur a rule. */
  forbiddenWords: readonly string[];
  valences: Readonly<Record<Valence, string>>;
  labels: Readonly<{
    because: string;
    /** `because` before a vowel. */
    becauseElided: string;
    chosenOption: string;
    reevaluation: string;
    criterionPrefix: string;
    rulePrefix: string;
  }>;
  /** The punctuation of the fixed sentences, spaces included: the checker and the skeleton build them from it. */
  punctuation: Readonly<{
    /** Between a bold label (`C1`, `R1`) and its text. */
    labelSeparator: string;
    /** Between `chosenOption` or `reevaluation` and what follows. */
    colon: string;
    /** After a valence, after the quoted chosen option, between cited criteria. */
    comma: string;
    quoteOpen: string;
    quoteClose: string;
    citationOpen: string;
    citationClose: string;
    /** Ends the question of the context. */
    questionMark: string;
  }>;
  title: Readonly<{
    maxCodePoints: number;
    forbiddenCharacters: readonly string[];
    finalPunctuation: readonly string[];
  }>;
  limits: Readonly<{ words: number; minOptions: number; maxSupersedes: number; headingDepth: number }>;
  markdown: Readonly<{ nodes: readonly string[]; fences: readonly string[] }>;
  /** Schemes an external link may use. */
  links: Readonly<{ schemes: readonly string[] }>;
}>;
