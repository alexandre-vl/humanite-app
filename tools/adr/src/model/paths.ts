import { ADR_DIRECTORY, ADR_FILE_NAME, INDEX_FILE_NAME, NUMBERED_NAME } from '../spec/layout.ts';
import type { AdrNumber } from './identifiers.ts';
import { adrNumber } from './identifiers.ts';

/** What a repository path is to the ADR process: every tool that locates an ADR classifies paths with this. */
export type AdrPathKind =
  /** `docs/adr/NNNN-slug.md`. */
  | Readonly<{ kind: 'adr'; number: AdrNumber; slug: string }>
  /** Directly in the ADR directory, starting with a number, but not a valid ADR name: the number is still taken. */
  | Readonly<{ kind: 'numbered'; number: AdrNumber }>
  /** The generated index. */
  | Readonly<{ kind: 'index' }>
  /** Directly in the ADR directory, without a number. */
  | Readonly<{ kind: 'unnumbered' }>
  /** Below a subdirectory of the ADR directory; the first segment is that subdirectory. */
  | Readonly<{ kind: 'nested'; directory: string }>
  | Readonly<{ kind: 'outside' }>;

const PREFIX = `${ADR_DIRECTORY}/`;

export function classifyAdrPath(path: string): AdrPathKind {
  if (!path.startsWith(PREFIX)) {
    return { kind: 'outside' };
  }
  const name = path.slice(PREFIX.length);
  const [directory = '', ...nested] = name.split('/');
  if (nested.length > 0) {
    return { kind: 'nested', directory };
  }
  if (name === INDEX_FILE_NAME) {
    return { kind: 'index' };
  }
  const strict = ADR_FILE_NAME.exec(name)?.groups;
  if (strict?.['number'] !== undefined && strict['slug'] !== undefined) {
    return { kind: 'adr', number: adrNumber(Number(strict['number'])), slug: strict['slug'] };
  }
  const digits = NUMBERED_NAME.exec(name)?.groups?.['number'];
  return digits === undefined ? { kind: 'unnumbered' } : { kind: 'numbered', number: adrNumber(Number(digits)) };
}

/** The number a path holds, valid ADR name or not; `null` when it holds none. */
export function numberOfPath(path: string): AdrNumber | null {
  const classified = classifyAdrPath(path);
  return classified.kind === 'adr' || classified.kind === 'numbered' ? classified.number : null;
}
