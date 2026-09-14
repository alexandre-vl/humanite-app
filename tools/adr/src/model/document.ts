import type { Position } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import type { FormatSpec, RuleLevel } from '../spec/formats/types.ts';
import type { Header } from './header.ts';
import type { AdrNumber, RuleId } from './identifiers.ts';

export type Rule = Readonly<{ id: RuleId; level: RuleLevel }>;

/** Where a link of an ADR points, as the checks read it. */
export type LinkTarget =
  /** An absolute address with an allowed scheme and a host. */
  | Readonly<{ kind: 'external'; url: string }>
  /** A file or directory of the repository, relative to the root; it may lead outside when it climbs too high. */
  | Readonly<{ kind: 'repository'; path: string }>
  /** An anchor in the ADR itself. */
  | Readonly<{ kind: 'fragment' }>
  /** No address, a scheme outside the format, or an encoding that cannot be read: reported where it is read. */
  | Readonly<{ kind: 'invalid' }>;

export type LinkReference = Readonly<{ url: string; target: LinkTarget; position: Position }>;

export type AdrMention = Readonly<{ number: AdrNumber; position: Position }>;

type AdrFile = Readonly<{
  path: RepoPath;
  number: AdrNumber;
  slug: string;
  /**
   * Equal for two versions that differ only by formatting or by their status: a decided ADR keeps it forever, and a
   * decision keeps the one of the proposal.
   */
  fingerprint: string;
  links: readonly LinkReference[];
  mentions: readonly AdrMention[];
}>;

/** An ADR whose header and title could be read: its status, rules and references are known. */
export type ReadableAdr = AdrFile &
  Readonly<{
    kind: 'readable';
    spec: FormatSpec;
    header: Header;
    title: string;
    /** `null` when the decision section, a rule label or a rule keyword cannot be read. */
    rules: readonly Rule[] | null;
  }>;

/** An ADR file whose header or title cannot be read: it still takes its number and keeps its history. */
export type UnreadableAdr = AdrFile & Readonly<{ kind: 'unreadable' }>;

export type AdrDocument = ReadableAdr | UnreadableAdr;
