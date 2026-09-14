import { ADR_DIRECTORY } from './spec.ts';
import type { Significance, Status } from './spec.ts';

declare const brand: unique symbol;

type Brand<Value, Name extends string> = Value & Readonly<{ [brand]: Name }>;

/** ADR number, 0 to 9999, as written in the file name. */
export type AdrNumber = Brand<number, 'AdrNumber'>;

/** `ADR-0007`: how documents, bindings and commit messages refer to an ADR. */
export type AdrId = `ADR-${string}`;

/** Repository-relative POSIX path, never absolute, never leaving the repository. */
export type RepoPath = Brand<string, 'RepoPath'>;

export const isAdrNumber = (value: number): value is AdrNumber =>
  Number.isInteger(value) && value >= 0 && value <= 9999;

export function adrNumber(value: number): AdrNumber {
  if (!isAdrNumber(value)) {
    throw new RangeError(`Numéro d’ADR hors de 0–9999 : ${String(value)}`);
  }
  return value;
}

export const formatAdrId = (number: AdrNumber): AdrId => `ADR-${String(number).padStart(4, '0')}`;

const ADR_ID_PATTERN = /^ADR-(\d{4})$/u;

export function parseAdrId(value: string): AdrNumber | null {
  const digits = ADR_ID_PATTERN.exec(value)?.[1];
  return digits === undefined ? null : adrNumber(Number(digits));
}

export const isRepoPath = (value: string): value is RepoPath =>
  value !== '' &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');

export function repoPath(value: string): RepoPath {
  if (!isRepoPath(value)) {
    throw new Error(`Chemin de dépôt invalide : ${JSON.stringify(value)}`);
  }
  return value;
}

export const adrPath = (number: AdrNumber, slug: string): RepoPath =>
  repoPath(`${ADR_DIRECTORY}/${String(number).padStart(4, '0')}-${slug}.md`);

export type FrontMatter = Readonly<{
  format: 1;
  status: Status;
  significance: readonly Significance[];
  /** Older ADRs this one replaces once accepted; empty when absent from the file. */
  supersedes: readonly AdrNumber[];
}>;

/** Identifier of a rule inside its ADR: `R1`, `R2`… */
export type RuleId = `R${number}`;

export const isRuleId = (value: string): value is RuleId => /^R[1-9]\d*$/u.test(value);

/** A rule that no fixture can prove, with the reason; a decided ADR needs at least one proven rule. */
export type Convention = Readonly<{ convention: string }>;

export type RuleBinding<Proof extends string> = readonly [Proof, ...Proof[]] | Convention;

/** What `tools/adr/src/bindings.ts` records for one ADR: the paths it governs and how each binding rule is proven. */
export type AdrBinding<Proof extends string> = Readonly<{
  scope: readonly [string, ...string[]];
  rules: Readonly<Partial<Record<RuleId, RuleBinding<Proof>>>>;
}>;

export type Bindings<Proof extends string = string> = Readonly<Partial<Record<AdrId, AdrBinding<Proof>>>>;

export const isConvention = <Proof extends string>(binding: RuleBinding<Proof>): binding is Convention =>
  'convention' in binding;
