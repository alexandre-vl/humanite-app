/**
 * Words as a command receives them once the shell expanded them: text known from the line, and pieces whose value
 * only the running shell knows. Unquoted text keeps its pathname-expansion characters active.
 */

export type Piece =
  /** `pattern`: unquoted text whose `*`, `?` and `[…]` expand to file names. */
  | Readonly<{ kind: 'text'; text: string; pattern: boolean }>
  /** An expansion the line gives no value to, kept as written. */
  | Readonly<{ kind: 'unknown'; source: string }>;

export type Word = Readonly<{
  /** The word with its quotes removed; unknown expansions appear as written. */
  text: string;
  pieces: readonly Piece[];
}>;

const pieceText = (piece: Piece): string => (piece.kind === 'text' ? piece.text : piece.source);

/** A word from its pieces, adjacent text of the same kind merged and empty text dropped. */
export function makeWord(pieces: readonly Piece[]): Word {
  const merged: Piece[] = [];
  for (const piece of pieces) {
    const last = merged.at(-1);
    if (piece.kind === 'text' && piece.text === '') {
      continue;
    }
    if (piece.kind === 'text' && last?.kind === 'text' && last.pattern === piece.pattern) {
      merged[merged.length - 1] = { kind: 'text', text: `${last.text}${piece.text}`, pattern: piece.pattern };
    } else {
      merged.push(piece);
    }
  }
  return { text: merged.map(pieceText).join(''), pieces: merged };
}

/** A word known in full, without pattern characters. */
export const literalWord = (text: string): Word => makeWord([{ kind: 'text', text, pattern: false }]);

export const isKnown = (word: Word): boolean => word.pieces.every((piece) => piece.kind === 'text');

/** Whether the shell may replace the word with the names of existing files. */
export const isPattern = (word: Word): boolean =>
  word.pieces.some((piece) => piece.kind === 'text' && piece.pattern && /[*?[]/u.test(piece.text));

/** Whether any of the word is known: a word made of unknown expansions only could name anything. */
export const hasKnownText = (word: Word): boolean => word.pieces.some((piece) => piece.kind === 'text');

/** Class bodies of the POSIX character classes, for bracket expressions. */
const POSIX_CLASSES: Readonly<Record<string, string>> = {
  alnum: String.raw`\p{L}\p{Nd}`,
  alpha: String.raw`\p{L}`,
  blank: String.raw` \t`,
  cntrl: String.raw`\p{Cc}`,
  digit: String.raw`\p{Nd}`,
  graph: String.raw`\S`,
  lower: String.raw`\p{Ll}`,
  print: String.raw`\P{Cc}`,
  punct: String.raw`\p{P}`,
  space: String.raw`\s`,
  upper: String.raw`\p{Lu}`,
  word: String.raw`\w`,
  xdigit: '0-9A-Fa-f',
};

/** Source of the bracket expression opening at `start`, with the index after it; `null` when it never closes. */
function bracketExpression(text: string, start: number): Readonly<{ source: string; end: number }> | null {
  let index = start + 1;
  const negated = text[index] === '!' || text[index] === '^';
  index += negated ? 1 : 0;
  let body = '';
  for (let first = true; index < text.length && (first || text[index] !== ']'); first = false) {
    const posix = /^\[:(\w+):\]/u.exec(text.slice(index));
    if (posix?.[1] !== undefined) {
      body += POSIX_CLASSES[posix[1]] ?? String.raw`\s\S`;
      index += posix[0].length;
    } else {
      const character = text[index] ?? '';
      body += character === '-' ? '-' : RegExp.escape(character);
      index += 1;
    }
  }
  return index < text.length ? { source: `[${negated ? '^' : ''}${body}]`, end: index + 1 } : null;
}

/** Source of a pattern piece: `*` and `?` stay within one path segment, as pathname expansion does. */
function patternSource(text: string): string {
  let source = '';
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? '';
    const bracket = character === '[' ? bracketExpression(text, index) : null;
    if (bracket !== null) {
      source += bracket.source;
      index = bracket.end - 1;
    } else if (character === '*') {
      source += '[^/]*';
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += RegExp.escape(character);
    }
  }
  return source;
}

/** Regular expression source of every text the word may become; unknown pieces match anything, slashes included. */
export const wordSource = (word: Word): string =>
  word.pieces
    .map((piece) => {
      if (piece.kind === 'unknown') {
        return '.*';
      }
      return piece.pattern ? patternSource(piece.text) : RegExp.escape(piece.text);
    })
    .join('');

/** Source of the word read as a pattern by the command itself, quoted or not: `find -name`, `git rm` pathspecs. */
export const globSource = (word: Word): string =>
  word.pieces.map((piece) => (piece.kind === 'unknown' ? '.*' : patternSource(piece.text))).join('');

/** The path segments of a known word, each a word of its own; `null` when an unknown piece may hold slashes. */
export function pathSegments(word: Word): readonly Word[] | null {
  if (!isKnown(word)) {
    return null;
  }
  const segments: Piece[][] = [[]];
  for (const piece of word.pieces) {
    if (piece.kind === 'unknown') {
      return null;
    }
    piece.text.split('/').forEach((text, index) => {
      if (index > 0) {
        segments.push([]);
      }
      segments.at(-1)?.push({ kind: 'text', text, pattern: piece.pattern });
    });
  }
  return segments.map(makeWord);
}
