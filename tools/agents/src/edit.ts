/**
 * What Claude Code's `Edit` tool leaves in a file, so that the guard judges the content an edit really writes.
 * Modelled on Claude Code 2.1.270: the file is read with CRLF turned into LF; `old_string` is looked for as written,
 * then with curly quotes straightened, then with `\uXXXX` escapes swapped for their characters or the reverse;
 * `new_string` takes the quote and escape style of the text it replaces, and a deletion takes the newline after it.
 * The call fails, writing nothing, when the text is absent, or found twice without `replace_all`.
 */

import { trimEndOf } from '@huma/kit/text';

export type FileEdit = Readonly<{ oldString: string; newString: string; replaceAll: boolean }>;

const LEFT_SINGLE = '‘';
const RIGHT_SINGLE = '’';
const LEFT_DOUBLE = '“';
const RIGHT_DOUBLE = '”';

const straightenQuotes = (text: string): string =>
  text
    .replaceAll(LEFT_SINGLE, "'")
    .replaceAll(RIGHT_SINGLE, "'")
    .replaceAll(LEFT_DOUBLE, '"')
    .replaceAll(RIGHT_DOUBLE, '"');

const UNICODE_ESCAPE = /\\u[0-9a-fA-F]{4}/u;

/** Whether a UTF-16 code unit of the text is outside ASCII, as Claude Code tests it. */
function hasNonAscii(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) >= 128) {
      return true;
    }
  }
  return false;
}

/** `\uXXXX` escapes turned into their characters; an escaped backslash stays as written. */
const unescapeUnicode = (text: string): string =>
  text.replaceAll(/(\\\\)|\\u([0-9a-fA-F]{4})/gu, (match: string, backslashes: string | undefined, hex: string) =>
    backslashes === undefined ? String.fromCharCode(Number.parseInt(hex, 16)) : match,
  );

/** Pattern source matching `text` with each non-ASCII code unit written as a `\uXXXX` escape, hex in either case. */
function escapedSource(text: string): string {
  let source = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 128) {
      source += RegExp.escape(text.charAt(index));
      continue;
    }
    source += String.raw`\\u`;
    for (const digit of code.toString(16).padStart(4, '0')) {
      source += digit >= 'a' ? `[${digit}${digit.toUpperCase()}]` : digit;
    }
  }
  return source;
}

/** The text of the file that `oldString` designates, or `null` when Claude Code does not find it. */
function actualOldString(content: string, oldString: string): string | null {
  if (content.includes(oldString)) {
    return oldString;
  }
  const index = straightenQuotes(content).indexOf(straightenQuotes(oldString));
  if (index !== -1) {
    return content.substring(index, index + oldString.length);
  }
  const unescaped = unescapeUnicode(oldString);
  if (UNICODE_ESCAPE.test(oldString) && unescaped !== oldString && content.includes(unescaped)) {
    return unescaped;
  }
  return hasNonAscii(oldString) ? (new RegExp(escapedSource(oldString), 'u').exec(content)?.[0] ?? null) : null;
}

/** Whether a quote at `index` opens: at the start, or after a blank, an opening bracket or a dash. */
const opensQuote = (characters: readonly string[], index: number): boolean =>
  index === 0 || [' ', '\t', '\n', '\r', '(', '[', '{', '—', '–'].includes(characters[index - 1] ?? '');

/** `newString` with its straight quotes curled when the text it replaces holds curly ones. */
function keepQuoteStyle(oldString: string, actual: string, newString: string): string {
  const curlyDouble = actual.includes(LEFT_DOUBLE) || actual.includes(RIGHT_DOUBLE);
  const curlySingle = actual.includes(LEFT_SINGLE) || actual.includes(RIGHT_SINGLE);
  if (oldString === actual || (!curlyDouble && !curlySingle)) {
    return newString;
  }
  const characters = Array.from(newString);
  return characters
    .map((character, index) => {
      if (character === '"' && curlyDouble) {
        return opensQuote(characters, index) ? LEFT_DOUBLE : RIGHT_DOUBLE;
      }
      if (character === "'" && curlySingle) {
        const inWord = /\p{L}/u.test(characters[index - 1] ?? '') && /\p{L}/u.test(characters[index + 1] ?? '');
        return inWord || !opensQuote(characters, index) ? RIGHT_SINGLE : LEFT_SINGLE;
      }
      return character;
    })
    .join('');
}

/** `newString` in the escape style of the text it replaces: escaped where the file holds escapes, and the reverse. */
function keepEscapeStyle(oldString: string, actual: string, newString: string): string {
  if (oldString === actual) {
    return newString;
  }
  if (!hasNonAscii(oldString) || !new RegExp(`^${escapedSource(oldString)}$`, 'u').test(actual)) {
    return UNICODE_ESCAPE.test(oldString) && unescapeUnicode(oldString) === actual
      ? unescapeUnicode(newString)
      : newString;
  }
  const known = new Map<number, string>();
  let upper = 0;
  let lower = 0;
  for (let index = 0, position = 0; index < oldString.length; index += 1) {
    const code = oldString.charCodeAt(index);
    if (code < 128) {
      position += 1;
      continue;
    }
    const hex = actual.slice(position + 2, position + 6);
    known.set(code, hex);
    upper += hex.replaceAll(/[^A-F]/gu, '').length;
    lower += hex.replaceAll(/[^a-f]/gu, '').length;
    position += 6;
  }
  let result = '';
  for (let index = 0; index < newString.length; index += 1) {
    const code = newString.charCodeAt(index);
    const hex = code.toString(16).padStart(4, '0');
    result +=
      code < 128 ? newString.charAt(index) : `\\u${known.get(code) ?? (upper > lower ? hex.toUpperCase() : hex)}`;
  }
  return result;
}

const occurrences = (content: string, text: string): number => content.split(text).length - 1;

/** The content after one edit, or `null` when Claude Code refuses it. */
function applyEdit(content: string, edit: FileEdit, keepEscapes: boolean): string | null {
  const actual = actualOldString(content, edit.oldString);
  if (edit.oldString === '' || actual === null || (!edit.replaceAll && occurrences(content, actual) > 1)) {
    return null;
  }
  const quoted = keepQuoteStyle(edit.oldString, actual, edit.newString);
  const replacement = keepEscapes ? keepEscapeStyle(edit.oldString, actual, quoted) : quoted;
  const searched =
    replacement === '' && !actual.endsWith('\n') && content.includes(`${actual}\n`) ? `${actual}\n` : actual;
  const result = edit.replaceAll
    ? content.replaceAll(searched, () => replacement)
    : content.replace(searched, () => replacement);
  return result === content ? null : result;
}

/** A file with nothing but blanks, or no file at all, takes the new text of an edit whose `old_string` is empty. */
const created = (content: string | null, edit: FileEdit): string | null | undefined =>
  edit.oldString === '' ? (content === null || content.trim() === '' ? edit.newString : null) : undefined;

/** Content Claude Code writes for an `Edit` call on a file holding `content` (`null`: absent); `null` if it fails. */
export function contentAfterEdit(content: string | null, edit: FileEdit): string | null {
  const creation = created(content, edit);
  if (creation !== undefined) {
    return creation;
  }
  return content === null ? null : applyEdit(content.replaceAll('\r\n', '\n'), edit, true);
}

/** Content for a `MultiEdit` call: the edits in order, none replacing text an earlier one wrote; `null` if it fails. */
export function contentAfterMultiEdit(content: string | null, edits: readonly FileEdit[]): string | null {
  const [first] = edits;
  if (first !== undefined && edits.length === 1) {
    const creation = created(content, first);
    if (creation !== undefined) {
      return creation;
    }
  }
  let current = content?.replaceAll('\r\n', '\n') ?? null;
  const written: string[] = [];
  for (const edit of edits) {
    const trimmed = trimEndOf(edit.oldString, '\n');
    if (current === null || (trimmed !== '' && written.some((text) => text.includes(trimmed)))) {
      return null;
    }
    current = applyEdit(current, edit, false);
    written.push(edit.newString);
  }
  return current;
}
