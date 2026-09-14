/**
 * A reading of shell command lines good enough to recognise the commands an agent must not run: it splits on
 * operators, honours quotes and escapes, and descends into `$(…)`, backticks and `sh -c` scripts. It is not a shell:
 * a determined script can hide a command from it, which is why the git hooks and `pnpm verify` check again.
 */

export type SimpleCommand = Readonly<{
  /** Leading `NAME=value` words. */
  assignments: readonly string[];
  /** Command name and arguments, quotes removed. */
  words: readonly string[];
}>;

const OPERATOR_CHARACTERS = new Set([';', '&', '|', '\n', '(', ')']);

const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);

/** Commands that run the command given as their arguments, with the options they take before it. */
const WRAPPERS: Readonly<Record<string, Readonly<{ valueOptions: readonly string[] }>>> = {
  builtin: { valueOptions: [] },
  command: { valueOptions: [] },
  exec: { valueOptions: ['-a'] },
  nice: { valueOptions: ['-n'] },
  nohup: { valueOptions: [] },
  stdbuf: { valueOptions: ['-i', '-o', '-e'] },
  time: { valueOptions: [] },
  xargs: { valueOptions: ['-I', '-n', '-P', '-L', '-d', '-s'] },
};

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/u;

type Scan = { words: string[][]; nested: string[] };

/** Index just after the `)` that closes the `$(` opened before `start`, honouring quotes. */
function closingParenthesis(line: string, start: number): number {
  let depth = 1;
  let quote: '"' | "'" | null = null;
  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    if (quote !== null) {
      if (character === quote) {
        quote = null;
      } else if (character === '\\' && quote === '"') {
        index += 1;
      }
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === '\\') {
      index += 1;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }
  return line.length;
}

function scan(line: string): Scan {
  const groups: string[][] = [[]];
  const nested: string[] = [];
  let word: string | null = null;
  let quote: '"' | "'" | null = null;
  const current = (): string[] => groups[groups.length - 1] ?? [];
  const endWord = (): void => {
    if (word !== null) {
      current().push(word);
      word = null;
    }
  };
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? '';
    if (quote === "'") {
      if (character === "'") {
        quote = null;
      } else {
        word = `${word ?? ''}${character}`;
      }
      continue;
    }
    if (character === '\\') {
      word = `${word ?? ''}${line[index + 1] ?? ''}`;
      index += 1;
      continue;
    }
    if (character === '$' && line[index + 1] === '(') {
      const end = closingParenthesis(line, index + 2);
      nested.push(line.slice(index + 2, end - 1));
      word = `${word ?? ''}${line.slice(index, end)}`;
      index = end - 1;
      continue;
    }
    if (character === '`') {
      const end = line.indexOf('`', index + 1);
      const stop = end === -1 ? line.length : end;
      nested.push(line.slice(index + 1, stop));
      word = `${word ?? ''}${line.slice(index, stop + 1)}`;
      index = stop;
      continue;
    }
    if (quote === '"') {
      if (character === '"') {
        quote = null;
      } else {
        word = `${word ?? ''}${character}`;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      word ??= '';
      continue;
    }
    if (OPERATOR_CHARACTERS.has(character)) {
      endWord();
      groups.push([]);
      continue;
    }
    if (/\s/u.test(character)) {
      endWord();
      continue;
    }
    word = `${word ?? ''}${character}`;
  }
  endWord();
  return { words: groups.filter((group) => group.length > 0), nested };
}

/** The words after the options of a wrapper command, or `null` when `words` is not a wrapper call. */
function unwrap(words: readonly string[]): readonly string[] | null {
  const [name, ...rest] = words;
  if (name === 'env') {
    let index = 0;
    while (index < rest.length) {
      const word = rest[index] ?? '';
      if (word === '-u' || word === '--unset' || word === '-C' || word === '--chdir' || word === '-S') {
        index += 2;
      } else if (word.startsWith('-') || ASSIGNMENT.test(word)) {
        index += 1;
      } else {
        break;
      }
    }
    return rest.slice(index);
  }
  if (name === 'timeout') {
    let index = 0;
    while ((rest[index] ?? '').startsWith('-')) {
      index += rest[index] === '-s' || rest[index] === '-k' ? 2 : 1;
    }
    return rest.slice(index + 1);
  }
  const wrapper = name === undefined ? undefined : WRAPPERS[name];
  if (wrapper === undefined) {
    return null;
  }
  let index = 0;
  while ((rest[index] ?? '').startsWith('-')) {
    index += wrapper.valueOptions.includes(rest[index] ?? '') ? 2 : 1;
  }
  return rest.slice(index);
}

/** Every simple command of a command line, wrappers peeled off, nested scripts included. */
export function simpleCommands(line: string, depth = 0): readonly SimpleCommand[] {
  if (depth > 8) {
    return [];
  }
  const { words: groups, nested } = scan(line);
  const commands: SimpleCommand[] = [];
  for (const group of groups) {
    let words: readonly string[] = group;
    const assignments: string[] = [];
    for (;;) {
      while (words.length > 0 && ASSIGNMENT.test(words[0] ?? '')) {
        assignments.push(words[0] ?? '');
        words = words.slice(1);
      }
      commands.push({ assignments: [...assignments], words });
      const inner = unwrap(words);
      if (inner === null || inner.length === 0) {
        break;
      }
      words = inner;
    }
    const [name, flag, script] = words;
    if (name !== undefined && SHELLS.has(name) && flag === '-c' && script !== undefined) {
      commands.push(...simpleCommands(script, depth + 1));
    }
    if (name === 'eval') {
      commands.push(...simpleCommands(words.slice(1).join(' '), depth + 1));
    }
  }
  for (const script of nested) {
    commands.push(...simpleCommands(script, depth + 1));
  }
  return commands;
}
