import type { Position } from '@huma/kit/diagnostics';
import { START } from '@huma/kit/diagnostics';
import { decodeUtf8 } from '@huma/kit/text';
import type { FileReport } from './report.ts';

const BYTE_ORDER_MARK = '\u{FEFF}';

/** Line feed and tab are the only control characters of a Markdown source. */
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
const ALLOWED_CONTROLS = new Set(['\n', '\t']);
const MAX_INVISIBLE_REPORTS = 5;

function positionAt(text: string, index: number): Position {
  const before = text.slice(0, index);
  const lastNewline = before.lastIndexOf('\n');
  return { line: before.split('\n').length, column: index - lastNewline };
}

function firstDecomposition(text: string): Position | null {
  if (text === text.normalize('NFC')) {
    return null;
  }
  for (const match of text.matchAll(/\P{M}\p{M}*/gu)) {
    if (match[0] !== match[0].normalize('NFC')) {
      return positionAt(text, match.index);
    }
  }
  return START;
}

const codePointLabel = (character: string): string =>
  `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * The text an ADR file holds, decoded strictly, without its byte order mark, normalized to NFC and with LF line
 * endings, or `null` when the bytes are not UTF-8. Every repair is reported once per kind: the checks that follow read
 * the repaired text.
 */
export function decodeSource(bytes: Uint8Array, report: FileReport): string | null {
  const decoded = decodeUtf8(bytes);
  if (decoded === null) {
    report('adr/encoding-invalid-utf8', START, {});
    return null;
  }
  let text = decoded;
  if (text.startsWith(BYTE_ORDER_MARK)) {
    report('adr/encoding-bom', START, {});
    text = text.slice(BYTE_ORDER_MARK.length);
  }
  const decomposed = firstDecomposition(text);
  if (decomposed !== null) {
    report('adr/encoding-not-nfc', decomposed, {});
    text = text.normalize('NFC');
  }
  const firstOfEach = new Map<string, number>();
  for (const match of text.matchAll(INVISIBLE)) {
    if (!ALLOWED_CONTROLS.has(match[0]) && !firstOfEach.has(match[0])) {
      firstOfEach.set(match[0], match.index);
    }
  }
  for (const [character, index] of [...firstOfEach].slice(0, MAX_INVISIBLE_REPORTS)) {
    report('adr/encoding-invisible', positionAt(text, index), { codePoint: codePointLabel(character) });
  }
  return text.replaceAll('\r\n', '\n');
}
