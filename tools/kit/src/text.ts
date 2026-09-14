/** Orders strings by UTF-16 code unit, identically on every machine and locale. */
export const compareText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

/** 1-based number of the first line of `expected` that `actual` does not reproduce. */
export function firstDifferentLine(actual: string, expected: string): number {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  const index = expectedLines.findIndex((line, position) => actualLines[position] !== line);
  if (index !== -1) {
    return index + 1;
  }
  return actualLines.length > expectedLines.length ? expectedLines.length + 1 : 1;
}

const strictDecoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Text of `bytes`, or `null` when they are not valid UTF-8; a byte order mark is kept in the text. */
export function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return strictDecoder.decode(bytes);
  } catch {
    return null;
  }
}
