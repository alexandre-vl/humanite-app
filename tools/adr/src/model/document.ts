import type { Position } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import type { FrontMatter } from '../analysis/frontmatter.ts';
import type { FormatSpec, RuleLevel } from '../spec/formats/types.ts';
import type { AdrNumber, RuleId } from './identifiers.ts';

export type Rule = Readonly<{ id: RuleId; level: RuleLevel }>;

/** A link of an ADR; `target` is the repository path it points at when it is relative, `null` otherwise. */
export type LinkReference = Readonly<{ url: string; target: string | null; position: Position }>;

export type AdrMention = Readonly<{ number: AdrNumber; position: Position }>;

type AdrFile = Readonly<{
  path: RepoPath;
  number: AdrNumber;
  slug: string;
  /** Equal for two versions that differ only by formatting; used to detect a change after a decision. */
  fingerprint: string;
  links: readonly LinkReference[];
  mentions: readonly AdrMention[];
}>;

/** An ADR whose header and title could be read: its status, rules and references are known. */
export type ReadableAdr = AdrFile &
  Readonly<{
    kind: 'readable';
    spec: FormatSpec;
    frontMatter: FrontMatter;
    title: string;
    /** `null` when the decision section, a rule label or a rule keyword cannot be read. */
    rules: readonly Rule[] | null;
  }>;

/** An ADR file whose header or title cannot be read: it still takes its number and keeps its history. */
export type UnreadableAdr = AdrFile & Readonly<{ kind: 'unreadable' }>;

export type AdrDocument = ReadableAdr | UnreadableAdr;
