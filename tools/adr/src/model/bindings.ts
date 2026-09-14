import type { RepoPath } from '@huma/kit/paths';

/** A rule no fixture can prove, with the reason; an accepted ADR still needs at least one proven rule. */
export type Convention = Readonly<{ convention: string }>;

export type RuleBinding<Proof extends string> = readonly [Proof, ...Proof[]] | Convention;

/** What an ADR governs: repository paths matched by globs relative to the root (`*`, `**` and `?`). */
export type Scope = Readonly<{ paths: readonly [string, ...string[]] }>;

/** How one ADR is enforced: the paths it governs and, per binding rule, the fixtures that prove it. */
export type AdrBinding<Proof extends string> = Readonly<{
  scope: Scope;
  rules: Readonly<Record<string, RuleBinding<Proof>>>;
}>;

/** Keyed by `ADR-NNNN`. The keys and rule ids are strings on purpose: `adr:check` reports each malformed one. */
export type Bindings<Proof extends string = string> = Readonly<Record<string, AdrBinding<Proof>>>;

export const isConvention = <Proof extends string>(binding: RuleBinding<Proof>): binding is Convention =>
  'convention' in binding;

/** Proof ids linked to an ADR, each once, in order of appearance. */
export const proofsOf = <Proof extends string>(binding: AdrBinding<Proof> | undefined): readonly Proof[] => [
  ...new Set(Object.values(binding?.rules ?? {}).flatMap((rule) => (isConvention(rule) ? [] : rule))),
];

/** The bindings in force, the file that holds them, its text for positions, and the proof ids that exist. */
export type BindingsSource = Readonly<{
  bindings: Bindings;
  path: RepoPath;
  text: string | null;
  proofs: ReadonlySet<string>;
}>;

/** The bindings of `source` without the entries of `ids`, as they read once those entries are removed. */
export const withoutEntries = (source: BindingsSource, ids: readonly string[]): BindingsSource => ({
  ...source,
  bindings: Object.fromEntries(Object.entries(source.bindings).filter(([key]) => !ids.includes(key))),
});

/** Runs one proof and tells whether it passed. */
export type ProofRunner = (proof: string) => Promise<boolean>;
