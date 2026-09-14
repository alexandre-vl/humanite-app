/**
 * Reads a shell command line the way bash splits it, far enough to name the commands it runs, their words and the
 * files they redirect to: quotes and escapes, `$'…'`, comments, operators, redirections, here-documents, and the
 * scripts nested in `$(…)`, backquotes and process substitutions. It runs nothing and never fails: text it cannot
 * read stays text. Expansions keep their source; `commands.ts` gives them a value when the line itself sets one.
 */

export type RawPart =
  /** Literal text; `quoted` text takes part in neither brace expansion, field splitting nor pathname expansion. */
  | Readonly<{ kind: 'text'; text: string; quoted: boolean }>
  /** `$NAME` or `${NAME}`. */
  | Readonly<{ kind: 'parameter'; name: string; quoted: boolean }>
  /** `$(…)`, backquotes, `<(…)` and `>(…)`: a script whose output takes the place of the part. */
  | Readonly<{ kind: 'substitution'; script: RawScript; source: string; quoted: boolean }>
  /** Any other expansion (`$1`, `${x:-y}`, `$((…))`, `~user`), with the scripts it may run. */
  | Readonly<{ kind: 'opaque'; source: string; scripts: readonly RawScript[]; quoted: boolean }>
  /** An unquoted leading `~`: the home directory. */
  | Readonly<{ kind: 'home' }>;

export type RawWord = readonly RawPart[];

export type OutputOperator = '>' | '>>' | '>|' | '&>' | '&>>' | '<>';

/** Standard input given by a here-document or a here-string. */
export type RawText = Readonly<{
  /** The text as written, for a shell that reads it as a script. */
  source: string;
  /** The text as parts, expansions included. */
  parts: RawWord;
}>;

export type RawRedirection =
  /** `descriptor`: the file descriptor written before the operator, `null` when none is. */
  | Readonly<{ kind: 'output'; operator: OutputOperator; descriptor: number | null; target: RawWord }>
  | Readonly<{ kind: 'input'; target: RawWord }>
  | Readonly<{ kind: 'text'; text: RawText }>
  | Readonly<{ kind: 'duplicate' }>;

export type RawCommand = Readonly<{ words: readonly RawWord[]; redirections: readonly RawRedirection[] }>;

/** The simple commands of a script in the order they appear; nested scripts stay inside the parts that hold them. */
export type RawScript = readonly RawCommand[];

type Cursor = { readonly source: string; index: number };

const at = (cursor: Cursor, offset = 0): string => cursor.source[cursor.index + offset] ?? '';

const atEnd = (cursor: Cursor): boolean => cursor.index >= cursor.source.length;

/** Characters that end an unquoted word. */
const WORD_END = new Set([' ', '\t', '\n', ';', '&', '|', '(', ')', '<', '>']);

const SPECIAL_PARAMETER = /^[0-9@*#?$!-]/u;

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  a: '\u0007',
  b: '\b',
  e: '\u001B',
  E: '\u001B',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  '\\': '\\',
  "'": "'",
  '"': '"',
  '?': '?',
};

const NUMERIC_ESCAPES: readonly Readonly<{ pattern: RegExp; radix: number }>[] = [
  { pattern: /^([0-7]{1,3})/u, radix: 8 },
  { pattern: /^x([0-9a-fA-F]{1,2})/u, radix: 16 },
  { pattern: /^u([0-9a-fA-F]{1,4})/u, radix: 16 },
  { pattern: /^U([0-9a-fA-F]{1,8})/u, radix: 16 },
];

/** Text of `$'…'`, the cursor on its opening quote; escapes are decoded as bash decodes them. */
function readAnsiQuoted(cursor: Cursor): string {
  cursor.index += 1;
  let text = '';
  while (!atEnd(cursor) && at(cursor) !== "'") {
    if (at(cursor) !== '\\') {
      text += at(cursor);
      cursor.index += 1;
      continue;
    }
    const rest = cursor.source.slice(cursor.index + 1);
    const numeric = NUMERIC_ESCAPES.map(({ pattern, radix }) => ({ match: pattern.exec(rest), radix })).find(
      ({ match }) => match !== null,
    );
    const control = /^c(.)/su.exec(rest);
    if (numeric?.match?.[1] !== undefined) {
      const codePoint = Number.parseInt(numeric.match[1], numeric.radix);
      text += codePoint <= 0x10_ff_ff ? String.fromCodePoint(codePoint) : '';
      cursor.index += 1 + numeric.match[0].length;
    } else if (control?.[1] !== undefined) {
      text += String.fromCodePoint((control[1].codePointAt(0) ?? 0) % 32);
      cursor.index += 3;
    } else {
      text += SIMPLE_ESCAPES[rest.slice(0, 1)] ?? `\\${rest.slice(0, 1)}`;
      cursor.index += 2;
    }
  }
  cursor.index += 1;
  return text;
}

/** Index just after the `close` that balances an `open` before the cursor, quotes honoured. */
function balancedEnd(cursor: Cursor, open: string, close: string): number {
  let depth = 1;
  let quote = '';
  for (let index = cursor.index; index < cursor.source.length; index += 1) {
    const character = cursor.source[index] ?? '';
    if (quote !== '') {
      if (character === quote) {
        quote = '';
      } else if (character === '\\' && quote === '"') {
        index += 1;
      }
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === '\\') {
      index += 1;
    } else if (character === open) {
      depth += 1;
    } else if (character === close) {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }
  return cursor.source.length;
}

const scriptsOf = (parts: RawWord): readonly RawScript[] =>
  parts.flatMap((part) => {
    switch (part.kind) {
      case 'substitution':
        return [part.script];
      case 'opaque':
        return part.scripts;
      case 'text':
      case 'parameter':
      case 'home':
        return [];
    }
  });

/** Collects text and parts, flushing pending text before each expansion. */
function partsBuilder(quoted: boolean): Readonly<{
  text: (value: string) => void;
  part: (value: RawPart) => void;
  done: () => RawPart[];
}> {
  const parts: RawPart[] = [];
  let pending = '';
  const flush = (): void => {
    if (pending !== '') {
      parts.push({ kind: 'text', text: pending, quoted });
      pending = '';
    }
  };
  return {
    text: (value) => {
      pending += value;
    },
    part: (value) => {
      flush();
      parts.push(value);
    },
    done: () => {
      flush();
      return parts;
    },
  };
}

/** The expansion at a `$`, or `null` when this `$` is a plain character. */
function readDollar(cursor: Cursor, quoted: boolean): RawPart | null {
  const start = cursor.index;
  const next = at(cursor, 1);
  if (next === '(' && at(cursor, 2) === '(') {
    cursor.index += 3;
    const bodyStart = cursor.index;
    cursor.index = balancedEnd(cursor, '(', ')');
    const body = cursor.source.slice(bodyStart, cursor.index - 1);
    cursor.index += at(cursor) === ')' ? 1 : 0;
    const source = cursor.source.slice(start, cursor.index);
    return { kind: 'opaque', source, scripts: scriptsOf(readExpandingText(body)), quoted };
  }
  if (next === '(') {
    cursor.index += 2;
    const script = readScript(cursor, true);
    return { kind: 'substitution', script, source: cursor.source.slice(start, cursor.index), quoted };
  }
  if (next === '{') {
    cursor.index += 2;
    const end = balancedEnd(cursor, '{', '}');
    const body = cursor.source.slice(cursor.index, end - 1);
    cursor.index = end;
    if (/^[A-Za-z_]\w*$/u.test(body)) {
      return { kind: 'parameter', name: body, quoted };
    }
    return {
      kind: 'opaque',
      source: cursor.source.slice(start, end),
      scripts: scriptsOf(readExpandingText(body)),
      quoted,
    };
  }
  const name = /^[A-Za-z_]\w*/u.exec(cursor.source.slice(cursor.index + 1))?.[0];
  if (name !== undefined) {
    cursor.index += 1 + name.length;
    return { kind: 'parameter', name, quoted };
  }
  if (SPECIAL_PARAMETER.test(next)) {
    cursor.index += 2;
    return { kind: 'opaque', source: `$${next}`, scripts: [], quoted };
  }
  return null;
}

/** A backquoted substitution, the cursor on the opening backquote. */
function readBackquoted(cursor: Cursor, quoted: boolean): RawPart {
  const start = cursor.index;
  cursor.index += 1;
  let body = '';
  while (!atEnd(cursor) && at(cursor) !== '`') {
    if (at(cursor) === '\\' && ['`', '\\', '$'].includes(at(cursor, 1))) {
      body += at(cursor, 1);
      cursor.index += 2;
    } else {
      body += at(cursor);
      cursor.index += 1;
    }
  }
  cursor.index += 1;
  const script = readScript({ source: body, index: 0 }, false);
  return { kind: 'substitution', script, source: cursor.source.slice(start, cursor.index), quoted };
}

/**
 * Parts of a text where `$` and backquotes expand but quotes are plain characters, as in a here-document or a
 * `${…}` body; `terminator` ends a double-quoted string.
 */
function readExpanding(cursor: Cursor, terminator: '"' | null): RawPart[] {
  const builder = partsBuilder(true);
  const escapable = terminator === null ? ['$', '`', '\\', '\n'] : ['$', '`', '"', '\\', '\n'];
  while (!atEnd(cursor) && at(cursor) !== terminator) {
    const character = at(cursor);
    if (character === '\\' && escapable.includes(at(cursor, 1))) {
      builder.text(at(cursor, 1) === '\n' ? '' : at(cursor, 1));
      cursor.index += 2;
      continue;
    }
    const part = character === '$' ? readDollar(cursor, true) : character === '`' ? readBackquoted(cursor, true) : null;
    if (part === null) {
      builder.text(character);
      cursor.index += 1;
    } else {
      builder.part(part);
    }
  }
  return builder.done();
}

export const readExpandingText = (source: string): RawWord => readExpanding({ source, index: 0 }, null);

/** The parts of a double-quoted string, the cursor on its opening quote; `""` is one empty quoted part. */
function readDoubleQuoted(cursor: Cursor): RawPart[] {
  cursor.index += 1;
  const parts = readExpanding(cursor, '"');
  cursor.index += 1;
  return parts.length === 0 ? [{ kind: 'text', text: '', quoted: true }] : parts;
}

/** One word at the cursor: everything up to an unquoted blank or operator. */
function readWord(cursor: Cursor): RawWord {
  const builder = partsBuilder(false);
  const user = /^~([\w.-]*)(?=[/\s;&|()<>]|$)/u.exec(cursor.source.slice(cursor.index));
  if (user !== null) {
    builder.part(user[1] === '' ? { kind: 'home' } : { kind: 'opaque', source: user[0], scripts: [], quoted: false });
    cursor.index += user[0].length;
  }
  while (!atEnd(cursor) && !WORD_END.has(at(cursor))) {
    const character = at(cursor);
    const next = at(cursor, 1);
    if (character === '\\') {
      if (next !== '\n') {
        builder.part({ kind: 'text', text: next, quoted: true });
      }
      cursor.index += 2;
    } else if (character === "'") {
      const end = cursor.source.indexOf("'", cursor.index + 1);
      const stop = end === -1 ? cursor.source.length : end;
      builder.part({ kind: 'text', text: cursor.source.slice(cursor.index + 1, stop), quoted: true });
      cursor.index = stop + 1;
    } else if (character === '"') {
      readDoubleQuoted(cursor).forEach(builder.part);
    } else if (character === '$' && next === "'") {
      cursor.index += 1;
      builder.part({ kind: 'text', text: readAnsiQuoted(cursor), quoted: true });
    } else if (character === '$' && next === '"') {
      cursor.index += 1;
      readDoubleQuoted(cursor).forEach(builder.part);
    } else {
      const part =
        character === '$' ? readDollar(cursor, false) : character === '`' ? readBackquoted(cursor, false) : null;
      if (part === null) {
        builder.text(character);
        cursor.index += 1;
      } else {
        builder.part(part);
      }
    }
  }
  return builder.done();
}

type MutableText = { source: string; parts: RawWord };

type PendingText = Readonly<{ delimiter: string; literal: boolean; stripTabs: boolean; text: MutableText }>;

/** Bodies of the here-documents opened on the line that just ended, in order. */
function readHereDocuments(cursor: Cursor, pending: PendingText[]): void {
  for (const document of pending.splice(0)) {
    const lines: string[] = [];
    while (!atEnd(cursor)) {
      const end = cursor.source.indexOf('\n', cursor.index);
      const stop = end === -1 ? cursor.source.length : end;
      const line = cursor.source.slice(cursor.index, stop);
      cursor.index = stop + 1;
      const compared = document.stripTabs ? line.replace(/^\t+/u, '') : line;
      if (compared === document.delimiter) {
        break;
      }
      lines.push(compared);
    }
    document.text.source = lines.map((line) => `${line}\n`).join('');
    document.text.parts = document.literal
      ? [{ kind: 'text', text: document.text.source, quoted: true }]
      : readExpandingText(document.text.source);
  }
}

const REDIRECTION_OPERATORS = ['&>>', '&>', '<<<', '<<-', '<<', '<>', '>>', '>|', '>&', '<&', '>', '<'] as const;

const DUPLICATE_TARGET = /^(?:\d+|-)$/u;

/** A word as text, expansions as written: here-document delimiters and duplicated descriptors. */
const writtenText = (word: RawWord): string =>
  word
    .map((part) => {
      switch (part.kind) {
        case 'text':
          return part.text;
        case 'home':
          return '~';
        case 'parameter':
          return `$${part.name}`;
        case 'substitution':
        case 'opaque':
          return part.source;
      }
    })
    .join('');

/** The redirection at the cursor, or `null` when none starts there. */
function readRedirection(cursor: Cursor, pending: PendingText[]): RawRedirection | null {
  const start = cursor.index;
  const descriptor = /^\d+(?=[<>])/u.exec(cursor.source.slice(cursor.index))?.[0] ?? '';
  cursor.index += descriptor.length;
  const operator = REDIRECTION_OPERATORS.find(
    (candidate) =>
      cursor.source.startsWith(candidate, cursor.index) && !(descriptor !== '' && candidate.startsWith('&')),
  );
  if (operator === undefined || ((operator === '<' || operator === '>') && at(cursor, 1) === '(')) {
    cursor.index = start;
    return null;
  }
  cursor.index += operator.length;
  while (at(cursor) === ' ' || at(cursor) === '\t') {
    cursor.index += 1;
  }
  const wordStart = cursor.index;
  const target = readWord(cursor);
  switch (operator) {
    case '<<':
    case '<<-': {
      const text: MutableText = { source: '', parts: [] };
      const literal = /['"\\]/u.test(cursor.source.slice(wordStart, cursor.index));
      pending.push({ delimiter: writtenText(target), literal, stripTabs: operator === '<<-', text });
      return { kind: 'text', text };
    }
    case '<<<':
      return {
        kind: 'text',
        text: { source: `${writtenText(target)}\n`, parts: [...target, { kind: 'text', text: '\n', quoted: true }] },
      };
    case '<':
      return { kind: 'input', target };
    case '<&':
      return { kind: 'duplicate' };
    case '>&':
      return DUPLICATE_TARGET.test(writtenText(target))
        ? { kind: 'duplicate' }
        : { kind: 'output', operator: '&>', descriptor: null, target };
    case '&>>':
    case '&>':
    case '<>':
    case '>>':
    case '>|':
    case '>':
      return { kind: 'output', operator, descriptor: descriptor === '' ? null : Number(descriptor), target };
  }
}

/** Simple commands read from the cursor up to the end or, inside `$(…)`, up to its closing parenthesis. */
function readScript(cursor: Cursor, insideSubstitution: boolean): RawScript {
  const commands: RawCommand[] = [];
  const pending: PendingText[] = [];
  let words: RawWord[] = [];
  let redirections: RawRedirection[] = [];
  let depth = 0;
  const finish = (): void => {
    if (words.length > 0 || redirections.length > 0) {
      commands.push({ words, redirections });
    }
    words = [];
    redirections = [];
  };
  while (!atEnd(cursor)) {
    const character = at(cursor);
    const start = cursor.index;
    if (character === ' ' || character === '\t') {
      cursor.index += 1;
    } else if (character === '\\' && at(cursor, 1) === '\n') {
      cursor.index += 2;
    } else if (character === '\n') {
      finish();
      cursor.index += 1;
      readHereDocuments(cursor, pending);
    } else if (character === '#') {
      const end = cursor.source.indexOf('\n', cursor.index);
      cursor.index = end === -1 ? cursor.source.length : end;
    } else if (character === ')') {
      finish();
      cursor.index += 1;
      if (depth === 0 && insideSubstitution) {
        return commands;
      }
      depth = Math.max(0, depth - 1);
    } else if (character === '(') {
      finish();
      depth += 1;
      cursor.index += 1;
    } else if ((character === '<' || character === '>') && at(cursor, 1) === '(') {
      cursor.index += 2;
      const script = readScript(cursor, true);
      words.push([{ kind: 'substitution', script, source: cursor.source.slice(start, cursor.index), quoted: false }]);
    } else {
      const redirection = readRedirection(cursor, pending);
      if (redirection !== null) {
        redirections.push(redirection);
      } else if (character === ';' || character === '&' || character === '|') {
        finish();
        cursor.index += 1;
      } else {
        words.push(readWord(cursor));
        cursor.index = Math.max(cursor.index, start + 1);
      }
    }
  }
  finish();
  return commands;
}

/** The simple commands of a command line, in the order they appear. */
export const readCommandLine = (line: string): RawScript => readScript({ source: line, index: 0 }, false);
