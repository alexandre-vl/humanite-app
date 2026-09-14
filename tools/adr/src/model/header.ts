import type { Significance } from '../spec/significance.ts';
import { isSignificance, SIGNIFICANCES } from '../spec/significance.ts';
import type { Status } from '../spec/statuses.ts';
import { isStatus } from '../spec/statuses.ts';
import type { AdrNumber } from './identifiers.ts';
import { formatAdrId, parseAdrId } from './identifiers.ts';

/**
 * The YAML header of an ADR and its only accepted spelling. This module reads nothing but the canonical text, with no
 * YAML parser, so the agent hook can judge a write in a few milliseconds; the analysis reports every other spelling.
 */

export type Header = Readonly<{
  format: number;
  status: Status;
  /** In canonical order, without duplicates. */
  significance: readonly Significance[];
  /** Older ADRs this one replaces once accepted, ascending; empty when the field is absent. */
  supersedes: readonly AdrNumber[];
}>;

export const HEADER_DELIMITER = '---';

/** Lines of the canonical header between its delimiters: fixed key order, flow sequences in canonical order. */
export function headerLines(header: Header): readonly string[] {
  const significance = SIGNIFICANCES.filter((key) => header.significance.includes(key));
  const supersedes = [...new Set(header.supersedes)].toSorted((left, right) => left - right).map(formatAdrId);
  return [
    `format: ${String(header.format)}`,
    `status: ${header.status}`,
    `significance: [${significance.join(', ')}]`,
    ...(supersedes.length === 0 ? [] : [`supersedes: [${supersedes.join(', ')}]`]),
  ];
}

/** The canonical header block, delimiters and final line break included. */
export const renderHeader = (header: Header): string =>
  `${HEADER_DELIMITER}\n${headerLines(header).join('\n')}\n${HEADER_DELIMITER}\n`;

const FLOW_SEQUENCE = /^\[([^\][]*)\]$/u;

function flowItems(value: string): readonly string[] | null {
  const content = FLOW_SEQUENCE.exec(value)?.[1];
  return content === undefined ? null : content.split(', ');
}

/**
 * The header at the start of `text` when it is written exactly in its canonical form, with the length of that block;
 * `null` for anything else, however valid in YAML.
 */
export function readCanonicalHeader(text: string): Readonly<{ header: Header; length: number }> | null {
  const opening = `${HEADER_DELIMITER}\n`;
  const closing = `\n${HEADER_DELIMITER}\n`;
  const end = text.indexOf(closing, opening.length - 1);
  if (!text.startsWith(opening) || end === -1) {
    return null;
  }
  const fields = new Map<string, string>();
  for (const line of text.slice(opening.length, end).split('\n')) {
    const separator = line.indexOf(': ');
    if (separator === -1) {
      return null;
    }
    fields.set(line.slice(0, separator), line.slice(separator + 2));
  }
  const format = Number(fields.get('format'));
  const status = fields.get('status') ?? '';
  const significance = flowItems(fields.get('significance') ?? '') ?? [];
  const supersedes = fields.has('supersedes') ? (flowItems(fields.get('supersedes') ?? '') ?? ['']) : [];
  const numbers = supersedes.map(parseAdrId);
  if (
    !Number.isSafeInteger(format) ||
    format < 1 ||
    !isStatus(status) ||
    significance.length === 0 ||
    !significance.every(isSignificance) ||
    numbers.some((number) => number === null)
  ) {
    return null;
  }
  const header: Header = {
    format,
    status,
    significance: significance.filter(isSignificance),
    supersedes: numbers.flatMap((number) => (number === null ? [] : [number])),
  };
  const length = end + closing.length;
  return renderHeader(header) === text.slice(0, length) ? { header, length } : null;
}
