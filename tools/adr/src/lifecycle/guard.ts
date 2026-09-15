import { readCanonicalHeader } from '../model/header.ts';
import { classifyAdrPath } from '../model/paths.ts';
import { DECIDED_STATUSES, INITIAL_STATUS, isDecided } from '../spec/statuses.ts';

/**
 * What an agent may write in an ADR file, judged from the text alone so that the hook stays fast: it imports no
 * parser. An agent writes only proposed ADRs with a canonical header and never touches a decided one. This module
 * says what is wrong with a write; the guard of the agents says it to them.
 */

/** Any file directly in the ADR directory whose name starts with a number, even malformed: it holds an ADR. */
export function isAdrFilePath(repositoryPath: string): boolean {
  const { kind } = classifyAdrPath(repositoryPath);
  return kind === 'adr' || kind === 'numbered';
}

const HEADER_BLOCK = /^[\u{FEFF}\s]*---[^\n]*\r?\n([\s\S]*?)\r?\n---/u;

const DECIDED_WORD = new RegExp(
  String.raw`(?:${DECIDED_STATUSES.map((status) => RegExp.escape(status)).join('|')})`,
  'iu',
);

/**
 * Whether a text may hold a decided ADR, whatever the spelling of its header: canonical with a decided status, or any
 * other header block that mentions a decided status, escaped or not.
 */
export function looksDecided(text: string): boolean {
  const canonical = readCanonicalHeader(text);
  if (canonical !== null) {
    return isDecided(canonical.header.status);
  }
  const block = HEADER_BLOCK.exec(text)?.[1];
  return block !== undefined && (DECIDED_WORD.test(block) || /\\[ux]|&#|!!/u.test(block));
}

/**
 * What can make a write to an ADR file one an agent may not make: the file holds a decided ADR, the write leaves
 * something else than a canonical proposed header, or what it leaves cannot be computed from what it replaces.
 */
export const ADR_WRITE_PROBLEMS = ['decided', 'not-proposed', 'unknown-result'] as const;

export type AdrWriteProblem = (typeof ADR_WRITE_PROBLEMS)[number];

/**
 * What is wrong with a write that turns `before` (`null` for a new file) into `after` (`null` when it cannot be
 * computed), `null` when an agent may make it.
 */
export function adrWriteProblem(before: string | null, after: string | null): AdrWriteProblem | null {
  if (before !== null && looksDecided(before)) {
    return 'decided';
  }
  if (after === null) {
    return before === null ? null : 'unknown-result';
  }
  return readCanonicalHeader(after)?.header.status === INITIAL_STATUS ? null : 'not-proposed';
}
