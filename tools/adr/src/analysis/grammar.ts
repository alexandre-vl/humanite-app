import { NUMBER_DIGITS } from '../spec/layout.ts';
import type { FormatSpec, RuleLevel, Valence } from '../spec/formats/types.ts';
import { RULE_LEVELS, VALENCES } from '../spec/formats/types.ts';
import { ADR_MENTION } from '../model/identifiers.ts';

/** A piece of a text found by a pattern, with its index in that text. */
export type Match<Value extends string = string> = Readonly<{ text: string; index: number; value: Value }>;

export type KeywordScan = Readonly<{
  /** Capitalised modal words outside the format. */
  forbidden: readonly Match[];
  /** Negations that mix case or miss a word, such as `ne DOIT` or `NE DOIT JAMAIS`, with the expected spelling. */
  negations: readonly Match[];
  levels: readonly Match<RuleLevel>[];
}>;

export type CitationScan = Readonly<{ numbers: readonly number[]; malformed: readonly Match[] }>;

/** `valid` mentions carry their four digits as value. */
export type MentionScan = Readonly<{ valid: readonly Match[]; malformed: readonly Match[] }>;

/** Sentence patterns of one format: the checker, the skeleton of `adr:new` and the fixtures all read them. */
export type Grammar = Readonly<{
  valenceTemplate: string;
  matchValence: (text: string) => Valence | null;
  chosenOptionTemplate: string;
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

/** Word characters a keyword may not touch: letters, digits, apostrophes and hyphens (`PEUT-ÊTRE` is no keyword). */
const EDGE = String.raw`[\p{L}\p{N}’'\-]`;

const standalone = (words: readonly string[]): RegExp =>
  new RegExp(String.raw`(?<!${EDGE})(?:${alternation(words)})(?!${EDGE})`, 'gu');

/** Accents removed, index for index: the input is NFC, so each letter stays one code unit. */
const withoutAccents = (text: string): string =>
  Array.from(text, (character) => {
    const folded = character.normalize('NFD').replace(/\p{M}/gu, '');
    return folded.length === character.length ? folded : character;
  }).join('');

const maskMatches = (text: string, matches: readonly Match[]): string => {
  let masked = text;
  for (const match of matches) {
    masked = `${masked.slice(0, match.index)}${'\u{FFFC}'.repeat(match.text.length)}${masked.slice(match.index + match.text.length)}`;
  }
  return masked;
};

const caseInsensitive = (word: string): string =>
  Array.from(word, (letter) => `[${escape(letter.toLowerCase())}${escape(letter.toUpperCase())}]`).join('');

/** `NE` and `PAS` around the verb of the negative keyword forms, which all share them. */
function negationParts(forms: readonly string[]): Readonly<{ start: string; end: string }> {
  const words = forms[0]?.split(' ') ?? [];
  const [start] = words;
  const end = words.at(-1);
  if (words.length !== 3 || start === undefined || end === undefined) {
    throw new Error(`Formes négatives du format attendues en trois mots : ${forms.join(', ')}`);
  }
  return { start, end };
}

const allMatches = (pattern: RegExp, text: string): Match[] =>
  [...text.matchAll(pattern)].map((found) => ({ text: found[0], index: found.index, value: found[0] }));

const cache = new WeakMap<FormatSpec, Grammar>();

export function grammarOf(spec: FormatSpec): Grammar {
  const cached = cache.get(spec);
  if (cached !== undefined) {
    return cached;
  }
  const { labels, keywords } = spec;
  const because = `(?:${escape(`${labels.because} `)}|${escape(labels.becauseElided)})`;
  const valenceWords = VALENCES.map((key) => spec.valences[key]);
  const valenceLine = new RegExp(String.raw`^(${alternation(valenceWords)}), ${because}\S`, 'u');
  const chosenOption = new RegExp(String.raw`^${escape(labels.chosenOption)} : « (.+?) », ${because}\S`, 'u');
  const reevaluation = new RegExp(String.raw`^${escape(labels.reevaluation)} : \S`, 'u');

  const forbidden = standalone(spec.forbiddenWords);
  const allowedForms = RULE_LEVELS.flatMap((level) => keywords[level].forms.map((form) => ({ form, level })));
  const allowed = standalone(allowedForms.map(({ form }) => form));
  const negativeForms = keywords.mustNot.forms;
  const { start: negationStart, end: negationEnd } = negationParts(negativeForms);
  const negationPattern = new RegExp(
    String.raw`(?<!${EDGE})(?<start>${caseInsensitive(negationStart)} )?(?<verb>${alternation(keywords.must.forms)})(?<end> ${caseInsensitive(negationEnd)}(?!${EDGE}))?(?!${EDGE})`,
    'gu',
  );

  const criterion = escape(labels.criterionPrefix);
  const strictCitation = new RegExp(String.raw`\(${criterion}[1-9]\d*(?:, ${criterion}[1-9]\d*)*\)`, 'gu');
  const citationLike = new RegExp(String.raw`\(\s*${criterion}\s*\d[^)]*\)`, 'gu');

  const grammar: Grammar = {
    valenceTemplate: `${valenceWords.join(', ')}, ${labels.because} …`,
    matchValence: (text) => {
      const label = valenceLine.exec(text)?.[1];
      return VALENCES.find((key) => spec.valences[key] === label) ?? null;
    },
    chosenOptionTemplate: `${labels.chosenOption} : « option », ${labels.because} … (Cn)`,
    startsLikeChosenOption: (text) => text.startsWith(labels.chosenOption),
    matchChosenOption: (text) => chosenOption.exec(text)?.[1] ?? null,
    isReevaluation: (text) => reevaluation.test(text),
    labelledText: (text, label) => {
      const prefix = `${label}${labels.separator}`;
      return text.startsWith(prefix) && text.length > prefix.length ? text.slice(prefix.length) : null;
    },
    scanKeywords: (maskedText) => {
      const forbiddenMatches = allMatches(forbidden, withoutAccents(maskedText)).map((match) => ({
        ...match,
        text: maskedText.slice(match.index, match.index + match.text.length),
      }));
      const withoutForbidden = maskMatches(maskedText, forbiddenMatches);
      const negations = [...withoutForbidden.matchAll(negationPattern)].flatMap((found): Match[] => {
        const { start, verb = '', end } = found.groups ?? {};
        if ((start === undefined && end === undefined) || negativeForms.includes(found[0])) {
          return [];
        }
        const expected = negativeForms.find((form) => form.split(' ').includes(verb)) ?? negativeForms.join(', ');
        return [{ text: found[0], index: found.index, value: expected }];
      });
      const withoutNegations = maskMatches(withoutForbidden, negations);
      const levels = allMatches(allowed, withoutNegations).flatMap((match): Match<RuleLevel>[] => {
        const level = allowedForms.find(({ form }) => form === match.text)?.level;
        return level === undefined ? [] : [{ ...match, value: level }];
      });
      return { forbidden: forbiddenMatches, negations, levels };
    },
    scanCitations: (maskedText) => {
      const strict = allMatches(strictCitation, maskedText);
      const numbers = strict.flatMap((match) =>
        match.text
          .slice(1, -1)
          .split(', ')
          .map((label) => Number(label.slice(labels.criterionPrefix.length))),
      );
      const strictIndexes = new Set(strict.map((match) => match.index));
      const malformed = allMatches(citationLike, maskedText).filter((match) => !strictIndexes.has(match.index));
      return { numbers, malformed };
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
