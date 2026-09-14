import type { Brand } from '@huma/kit/brand';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { ADR_DIRECTORY, MAX_NUMBER, NUMBER_DIGITS } from '../spec/layout.ts';

/** ADR number, from 0 to `MAX_NUMBER`. */
export type AdrNumber = Brand<number, 'AdrNumber'>;

/** `ADR-0007`: how documents, bindings and commit messages name an ADR. */
export type AdrId = Brand<string, 'AdrId'>;

/** Identifier of a rule inside its ADR: `R1`, `R2`… */
export type RuleId = Brand<string, 'RuleId'>;

const isAdrNumber = (value: number): value is AdrNumber => Number.isInteger(value) && value >= 0 && value <= MAX_NUMBER;

export function adrNumber(value: number): AdrNumber {
  if (!isAdrNumber(value)) {
    throw new RangeError(`Numéro d’ADR hors de 0–${String(MAX_NUMBER)} : ${String(value)}`);
  }
  return value;
}

const ADR_ID = new RegExp(String.raw`^ADR-(\d{${String(NUMBER_DIGITS)}})$`, 'u');

const isAdrId = (value: string): value is AdrId => ADR_ID.test(value);

const pad = (number: AdrNumber): string => String(number).padStart(NUMBER_DIGITS, '0');

export function formatAdrId(number: AdrNumber): AdrId {
  const id = `ADR-${pad(number)}`;
  if (!isAdrId(id)) {
    throw new Error(`Identifiant d’ADR impossible : ${id}`);
  }
  return id;
}

export function parseAdrId(value: string): AdrNumber | null {
  const digits = ADR_ID.exec(value)?.[1];
  return digits === undefined ? null : adrNumber(Number(digits));
}

/** Any `ADR-` followed by digits, not glued to a letter, a digit or a hyphen: malformed widths are reported, not missed. */
export const ADR_MENTION = /(?<![\p{L}\p{N}-])ADR-(?<digits>\d+)(?![\p{L}\p{N}])/gu;

export const adrFileName = (number: AdrNumber, slug: string): string => `${pad(number)}-${slug}.md`;

export const adrPath = (number: AdrNumber, slug: string): RepoPath =>
  repoPath(`${ADR_DIRECTORY}/${adrFileName(number, slug)}`);

const RULE_ID = /^R[1-9]\d*$/u;

const isRuleId = (value: string): value is RuleId => RULE_ID.test(value);

/** Identifier of the rule at `index` (0-based) in the decision list. */
export function ruleIdAt(index: number): RuleId {
  const id = `R${String(index + 1)}`;
  if (!isRuleId(id)) {
    throw new RangeError(`Rang de règle invalide : ${String(index)}`);
  }
  return id;
}
