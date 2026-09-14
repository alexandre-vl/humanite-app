import { CODE_MASK } from './markdown.ts';
import type { RuleLevel, Valence } from './spec.ts';
import { FORBIDDEN_KEYWORDS, LABELS, RULE_KEYWORDS, VALENCE_ORDER, VALENCES } from './spec.ts';

/** Sentence patterns of an ADR body, built from `spec.ts` so that the checker and `adr:new` agree. */

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const alternation = (words: readonly string[]): string =>
  words
    .toSorted((left, right) => right.length - left.length)
    .map(escape)
    .join('|');

const standalone = (words: readonly string[]): RegExp =>
  new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${alternation(words)})(?![\p{L}\p{N}])`, 'gu');

/** `parce que` followed by a space, or elided to `parce qu’` / `parce qu'`. */
const BECAUSE = `${escape(LABELS.because.slice(0, -1))}(?:${escape(LABELS.because.slice(-1))} |['’])`;

const VALENCE_LINE = new RegExp(`^(${alternation(VALENCE_ORDER.map((key) => VALENCES[key]))}), ${BECAUSE}\\S`, 'u');

export function matchValence(text: string): Valence | null {
  const label = VALENCE_LINE.exec(text)?.[1];
  return VALENCE_ORDER.find((key) => VALENCES[key] === label) ?? null;
}

const CHOSEN_OPTION = new RegExp(`^${escape(LABELS.chosenOption)} : « (.+?) », ${BECAUSE}\\S`, 'u');

/** Name of the chosen option in `Option retenue : « X », parce que …`, `null` when the sentence has another shape. */
export const matchChosenOption = (text: string): string | null => CHOSEN_OPTION.exec(text)?.[1] ?? null;

export const startsLikeChosenOption = (text: string): boolean => text.startsWith(LABELS.chosenOption);

export const chosenOptionTemplate = (option: string, justification: string): string =>
  `${LABELS.chosenOption} : « ${option} », ${LABELS.because} ${justification}`;

const REEVALUATION = new RegExp(`^${escape(LABELS.reevaluation)} : \\S`, 'u');

export const isReevaluation = (text: string): boolean => REEVALUATION.test(text);

/** Text after `**C1** — ` or `**R1** — `, `null` when the label or the text is missing. */
export function labelledText(text: string, label: string): string | null {
  const prefix = `${label}${LABELS.labelSeparator}`;
  return text.startsWith(prefix) && text.length > prefix.length ? text.slice(prefix.length) : null;
}

const ALLOWED_KEYWORD = standalone(Object.keys(RULE_KEYWORDS));
const FORBIDDEN_KEYWORD = standalone(FORBIDDEN_KEYWORDS);

const isRuleKeyword = (word: string): word is keyof typeof RULE_KEYWORDS => Object.hasOwn(RULE_KEYWORDS, word);

export type KeywordScan = Readonly<{ forbidden: readonly string[]; levels: readonly RuleLevel[] }>;

/** Capitalised BCP 14 keywords of a text whose inline code is masked; forbidden words never count as allowed ones. */
export function scanKeywords(text: string): KeywordScan {
  const forbidden = [...text.matchAll(FORBIDDEN_KEYWORD)].map((match) => match[0]);
  const levels = [...text.replaceAll(FORBIDDEN_KEYWORD, CODE_MASK).matchAll(ALLOWED_KEYWORD)].flatMap((match) =>
    isRuleKeyword(match[0]) ? [RULE_KEYWORDS[match[0]]] : [],
  );
  return { forbidden, levels };
}

const CITATION = /\((C\d+(?:,\s*C\d+)*)\)/gu;

/** Criterion numbers cited as `(C1)` or `(C1, C3)`. */
export const citedCriteria = (text: string): readonly number[] =>
  [...text.matchAll(CITATION)].flatMap((match) =>
    (match[1] ?? '').split(/,\s*/u).map((label) => Number(label.slice(1))),
  );

export const ADR_MENTION = /ADR-(\d{4})/gu;
