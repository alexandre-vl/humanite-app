import { ADR_MENTION } from '../model/identifiers.ts';
import type { FormatSpec, RuleLevel, Valence } from '../spec/formats/types.ts';
import { RULE_LEVELS, VALENCES } from '../spec/formats/types.ts';
import { NUMBER_DIGITS } from '../spec/layout.ts';
import { CODE_MASK } from './mask.ts';

/** A piece of a text found by a pattern, with its index in that text. */
export type Match<Value extends string = string> = Readonly<{ text: string; index: number; value: Value }>;

export type KeywordScan = Readonly<{
  /** Capitalised modal words outside the format. */
  forbidden: readonly Match[];
  /** Keywords next to a negation word that is not an exact negative form, with the spelling to write instead. */
  negations: readonly Match[];
  levels: readonly Match<RuleLevel>[];
}>;

export type CitationScan = Readonly<{
  /** Each well-written citation, with the criterion numbers it cites. */
  citations: readonly Readonly<{ index: number; numbers: readonly number[] }>[];
  /** Every cited criterion number, in order of appearance. */
  numbers: readonly number[];
  malformed: readonly Match[];
}>;

/** `valid` mentions carry their four digits as value. */
export type MentionScan = Readonly<{ valid: readonly Match[]; malformed: readonly Match[] }>;

/**
 * The fixed sentences of one format, built from its labels and punctuation: the checker reads them, and the skeleton of
 * `adr:new`, the messages and the fixtures write them, so no sentence is spelled twice.
 */
export type Grammar = Readonly<{
  /** `parce que text`, or its elided form before a vowel sound when asked. */
  because: (text: string, elided?: boolean) => string;
  argumentLine: (valence: Valence, justification: string) => string;
  chosenOptionLine: (option: string, justification: string) => string;
  reevaluationLine: (trigger: string) => string;
  labelledLine: (label: string, text: string) => string;
  criterionLabel: (number: number) => string;
  ruleLabel: (number: number) => string;
  citation: (numbers: readonly number[]) => string;
  valenceTemplate: string;
  chosenOptionTemplate: string;
  citationExample: string;
  matchValence: (text: string) => Valence | null;
  startsLikeChosenOption: (text: string) => boolean;
  matchChosenOption: (text: string) => string | null;
  isReevaluation: (text: string) => boolean;
  /** Text after `**C1** — ` or `**R1** — `, `null` when the label, the separator or the text is missing. */
  labelledText: (text: string, label: string) => string | null;
  scanKeywords: (maskedText: string) => KeywordScan;
  scanCitations: (maskedText: string) => CitationScan;
  scanMentions: (text: string) => MentionScan;
  bindingLevels: readonly RuleLevel[];
  keywordList: string;
}>;

const escape = (text: string): string => RegExp.escape(text);

const alternation = (words: readonly string[]): string =>
  words
    .toSorted((left, right) => right.length - left.length)
    .map(escape)
    .join('|');

/** Characters a forbidden word may not touch: a hyphen separates words, so `FAUT-IL` still holds `FAUT`. */
const WORD_CHARACTER = String.raw`[\p{L}\p{N}’']`;

/** Characters a keyword may not touch: a hyphen glues words, so `PEUT-ÊTRE` holds no keyword. */
const KEYWORD_EDGE = String.raw`[\p{L}\p{N}’'\-]`;

/** Indexes of `KeywordForms`: the same index names the same grammatical number in every level. */
const GRAMMATICAL_NUMBERS = [0, 1] as const;

const WORD_BEFORE = /([\p{L}\p{N}’']+)\s+$/u;

const WORD_AFTER = /^\s+([\p{L}\p{N}’']+)/u;

/** Accents removed, index for index: the input is NFC, so each letter stays one code unit. */
const withoutAccents = (text: string): string =>
  Array.from(text, (character) => {
    const folded = character.normalize('NFD').replace(/\p{M}/gu, '');
    return folded.length === character.length ? folded : character;
  }).join('');

const folded = (word: string): string => withoutAccents(word).toUpperCase();

const maskMatches = (text: string, matches: readonly Match[]): string =>
  matches.reduce(
    (masked, match) =>
      `${masked.slice(0, match.index)}${CODE_MASK.repeat(match.text.length)}${masked.slice(match.index + match.text.length)}`,
    text,
  );

const allMatches = (pattern: RegExp, text: string): Match[] =>
  [...text.matchAll(pattern)].map((found) => ({ text: found[0], index: found.index, value: found[0] }));

const cache = new WeakMap<FormatSpec, Grammar>();

export function grammarOf(spec: FormatSpec): Grammar {
  const cached = cache.get(spec);
  if (cached !== undefined) {
    return cached;
  }
  const { labels, keywords, punctuation } = spec;
  const becausePattern = `(?:${escape(`${labels.because} `)}|${escape(labels.becauseElided)})`;
  const valenceWords = VALENCES.map((key) => spec.valences[key]);
  const valenceLine = new RegExp(
    String.raw`^(${alternation(valenceWords)})${escape(punctuation.comma)}${becausePattern}\S`,
    'u',
  );
  const chosenOptionStart = `${labels.chosenOption}${punctuation.colon}${punctuation.quoteOpen}`;
  const chosenOption = new RegExp(
    String.raw`^${escape(chosenOptionStart)}(.+?)${escape(`${punctuation.quoteClose}${punctuation.comma}`)}${becausePattern}\S`,
    'u',
  );
  const reevaluation = new RegExp(String.raw`^${escape(`${labels.reevaluation}${punctuation.colon}`)}\S`, 'u');

  const forbidden = new RegExp(
    String.raw`(?<!${WORD_CHARACTER})(?:${alternation(spec.forbiddenWords)})(?!${WORD_CHARACTER})`,
    'gu',
  );
  const affirmative = (['must', 'may'] as const).flatMap((level) =>
    GRAMMATICAL_NUMBERS.map((number) => ({ form: keywords[level].forms[number], level, number })),
  );
  const affirmativePattern = new RegExp(
    String.raw`(?<!${KEYWORD_EDGE})(?<elided>[Nn][’'])?(?<verb>${alternation(affirmative.map(({ form }) => form))})(?!${KEYWORD_EDGE})`,
    'gu',
  );
  const particlesBefore = new Set(spec.negation.before.map(folded));
  const particlesAfter = new Set(spec.negation.after.map(folded));

  const criterion = escape(labels.criterionPrefix);
  const citationOpen = escape(punctuation.citationOpen);
  const citationClose = escape(punctuation.citationClose);
  const strictCitation = new RegExp(
    String.raw`${citationOpen}${criterion}[1-9]\d*(?:${escape(punctuation.comma)}${criterion}[1-9]\d*)*${citationClose}`,
    'gu',
  );
  const citationLike = new RegExp(String.raw`${citationOpen}\s*${criterion}\s*\d[^)]*${citationClose}`, 'gu');

  const because = (text: string, elided = false): string =>
    elided ? `${labels.becauseElided}${text}` : `${labels.because} ${text}`;
  const citation = (numbers: readonly number[]): string =>
    `${punctuation.citationOpen}${numbers.map((number) => `${labels.criterionPrefix}${String(number)}`).join(punctuation.comma)}${punctuation.citationClose}`;

  const scanKeywords = (maskedText: string): KeywordScan => {
    const forbiddenMatches = allMatches(forbidden, withoutAccents(maskedText)).map((match) => ({
      ...match,
      text: maskedText.slice(match.index, match.index + match.text.length),
    }));
    const text = maskMatches(maskedText, forbiddenMatches);
    const negations: Match[] = [];
    const levels: Match<RuleLevel>[] = [];
    for (const found of text.matchAll(affirmativePattern)) {
      const verb = found.groups?.['verb'] ?? '';
      const keyword = affirmative.find(({ form }) => form === verb);
      if (keyword === undefined) {
        continue;
      }
      const verbStart = found.index + (found.groups?.['elided']?.length ?? 0);
      const verbEnd = verbStart + verb.length;
      const before = WORD_BEFORE.exec(text.slice(0, found.index));
      const after = WORD_AFTER.exec(text.slice(verbEnd));
      const negatedBefore = found.groups?.['elided'] !== undefined || particlesBefore.has(folded(before?.[1] ?? ''));
      const negatedAfter = particlesAfter.has(folded(after?.[1] ?? ''));
      if (!negatedBefore && !negatedAfter) {
        levels.push({ text: verb, index: verbStart, value: keyword.level });
        continue;
      }
      const start =
        found.groups?.['elided'] !== undefined || !negatedBefore
          ? found.index
          : found.index - (before?.[0].length ?? 0);
      const end = negatedAfter ? verbEnd + (after?.[0].length ?? 0) : verbEnd;
      const written = text.slice(start, end);
      const expected = keywords.mustNot.forms[keyword.number];
      if (keyword.level === 'must' && written === expected) {
        levels.push({ text: written, index: start, value: 'mustNot' });
      } else {
        negations.push({ text: written, index: start, value: expected });
      }
    }
    return {
      forbidden: forbiddenMatches,
      negations: negations.toSorted((left, right) => left.index - right.index),
      levels: levels.toSorted((left, right) => left.index - right.index),
    };
  };

  const grammar: Grammar = {
    because,
    argumentLine: (valence, justification) => `${spec.valences[valence]}${punctuation.comma}${justification}`,
    chosenOptionLine: (option, justification) =>
      `${chosenOptionStart}${option}${punctuation.quoteClose}${punctuation.comma}${justification}`,
    reevaluationLine: (trigger) => `${labels.reevaluation}${punctuation.colon}${trigger}`,
    labelledLine: (label, text) => `**${label}**${punctuation.labelSeparator}${text}`,
    criterionLabel: (number) => `${labels.criterionPrefix}${String(number)}`,
    ruleLabel: (number) => `${labels.rulePrefix}${String(number)}`,
    citation,
    valenceTemplate: `${valenceWords.join(punctuation.comma)}${punctuation.comma}${because('…')}`,
    chosenOptionTemplate: `${chosenOptionStart}option${punctuation.quoteClose}${punctuation.comma}${because('…')} ${citation([1])}`,
    citationExample: `${citation([1])} ou ${citation([1, 2])}`,
    matchValence: (text) => {
      const label = valenceLine.exec(text)?.[1];
      return VALENCES.find((key) => spec.valences[key] === label) ?? null;
    },
    startsLikeChosenOption: (text) => text.startsWith(labels.chosenOption),
    matchChosenOption: (text) => chosenOption.exec(text)?.[1] ?? null,
    isReevaluation: (text) => reevaluation.test(text),
    labelledText: (text, label) => {
      const prefix = `${label}${punctuation.labelSeparator}`;
      return text.startsWith(prefix) && text.length > prefix.length ? text.slice(prefix.length) : null;
    },
    scanKeywords,
    scanCitations: (maskedText) => {
      const citations = allMatches(strictCitation, maskedText).map((match) => ({
        index: match.index,
        numbers: match.text
          .slice(punctuation.citationOpen.length, -punctuation.citationClose.length)
          .split(punctuation.comma)
          .map((label) => Number(label.slice(labels.criterionPrefix.length))),
      }));
      const strictIndexes = new Set(citations.map((found) => found.index));
      const malformed = allMatches(citationLike, maskedText).filter((match) => !strictIndexes.has(match.index));
      return { citations, numbers: citations.flatMap((found) => found.numbers), malformed };
    },
    scanMentions: (text) => {
      const found = [...text.matchAll(ADR_MENTION)].map((match) => ({
        text: match[0],
        index: match.index,
        value: match.groups?.['digits'] ?? '',
      }));
      return {
        valid: found.filter((match) => match.value.length === NUMBER_DIGITS),
        malformed: found.filter((match) => match.value.length !== NUMBER_DIGITS),
      };
    },
    bindingLevels: RULE_LEVELS.filter((level) => keywords[level].binding),
    keywordList: RULE_LEVELS.map((level) => keywords[level].label).join(', '),
  };
  cache.set(spec, grammar);
  return grammar;
}
