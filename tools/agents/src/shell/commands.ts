import { basename } from 'node:path';
import type { OutputOperator, RawCommand, RawPart, RawRedirection, RawScript, RawWord } from './syntax.ts';
import { readCommandLine } from './syntax.ts';
import type { Piece, Word } from './words.ts';
import { isKnown, makeWord } from './words.ts';

/**
 * The simple commands a command line runs, with their words expanded as far as the line itself tells: brace
 * expansion, the home directory, variables the line assigns or loops over, and the commands that wrappers
 * (`env`, `timeout`, `xargs`…), shells (`bash -c`, `sh <<EOF`), `eval` and `find -exec` run in turn. It is not a
 * shell: a script can still hide a command from it, which is why `prepare-commit-msg` refuses a commit whose index
 * `pre-commit` never verified.
 */

type Assignment = Readonly<{ name: string; value: Word }>;

type Redirection =
  /** `descriptor`: the file descriptor written before the operator, `null` when none is. */
  | Readonly<{ kind: 'output'; operator: OutputOperator; descriptor: number | null; target: Word }>
  | Readonly<{ kind: 'input'; target: Word }>
  /** Standard input written in the line: `source` as written, `content` once expanded, `null` when unknown. */
  | Readonly<{ kind: 'text'; source: string; content: string | null }>;

export type SimpleCommand = Readonly<{
  /** Leading `NAME=value` words, and those `env` passes on. */
  assignments: readonly Assignment[];
  /** Command name and arguments. */
  words: readonly Word[];
  redirections: readonly Redirection[];
}>;

/** What the line cannot tell but the reader knows: the home directory of the user running it. */
export type ShellContext = Readonly<{ home: string | null }>;

/** Possible values of a variable, one per loop iteration; `null` when the line gives none. */
type Values = readonly (readonly Piece[])[] | null;

type Scope = Map<string, Values>;

/** Deepest nesting of scripts read: substitutions, shells, `eval`, wrappers. */
const MAX_DEPTH = 8;

/** Most combinations of loop values expanded for one command; beyond, the variables stay unknown. */
const MAX_BINDINGS = 64;

/** Most words brace expansion may produce from one word; beyond, the word stays as written. */
const MAX_BRACE_WORDS = 256;

/** Reserved words that may open a simple command without being part of it. */
const RESERVED = new Set(['!', '{', '}', 'if', 'then', 'else', 'elif', 'fi', 'do', 'done', 'while', 'until']);

/** Reserved words that open a construct whose own words run nothing. */
const CONSTRUCTS = new Set(['case', 'esac', '[[', 'coproc']);

const LOOPS = new Set(['for', 'select']);

const DECLARATIONS = new Set(['export', 'readonly', 'declare', 'typeset', 'local']);

const ASSIGNMENT = /^([A-Za-z_]\w*)\+?=/u;

const NAME = /^[A-Za-z_]\w*$/u;

/** Field separators of an `IFS` nothing changed. */
const DEFAULT_IFS = /[ \t\n]+/u;

type Atom = Readonly<{ kind: 'character'; character: string }> | Readonly<{ kind: 'part'; part: RawPart }>;

const isCharacter = (atom: Atom | undefined, character: string): boolean =>
  atom?.kind === 'character' && atom.character === character;

const characters = (text: string): Atom[] => Array.from(text, (character) => ({ kind: 'character', character }));

const atomsOf = (word: RawWord): Atom[] =>
  word.flatMap((part): Atom[] =>
    part.kind === 'text' && !part.quoted ? characters(part.text) : [{ kind: 'part', part }],
  );

/** Items of a `{first..last}` or `{first..last..step}` sequence, or `null` when the atoms are not one. */
function sequenceItems(atoms: readonly Atom[]): readonly string[] | null {
  const text = atoms.map((atom) => (atom.kind === 'character' ? atom.character : '\x00')).join('');
  const numbers = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/u.exec(text);
  const letters = /^([A-Za-z])\.\.([A-Za-z])$/u.exec(text);
  let bounds: readonly [number, number, number] | null = null;
  if (numbers?.[1] !== undefined && numbers[2] !== undefined) {
    bounds = [Number(numbers[1]), Number(numbers[2]), Math.abs(Number(numbers[3] ?? '1'))];
  } else if (letters?.[1] !== undefined && letters[2] !== undefined) {
    bounds = [letters[1].codePointAt(0) ?? 0, letters[2].codePointAt(0) ?? 0, 1];
  }
  if (bounds === null) {
    return null;
  }
  const [from, to, magnitude] = bounds;
  const step = (from <= to ? 1 : -1) * Math.max(magnitude, 1);
  if (Math.abs(to - from) / Math.abs(step) >= MAX_BRACE_WORDS) {
    return null;
  }
  const items: string[] = [];
  for (let value = from; step > 0 ? value <= to : value >= to; value += step) {
    items.push(numbers === null ? String.fromCodePoint(value) : String(value));
  }
  return items;
}

/** Brace expansion over unquoted braces, as bash performs it before any other expansion. */
function expandBraces(atoms: readonly Atom[]): readonly (readonly Atom[])[] {
  for (let open = 0; open < atoms.length; open += 1) {
    if (!isCharacter(atoms[open], '{')) {
      continue;
    }
    let depth = 0;
    let close = -1;
    const commas: number[] = [];
    for (let index = open + 1; index < atoms.length && close === -1; index += 1) {
      if (isCharacter(atoms[index], '{')) {
        depth += 1;
      } else if (isCharacter(atoms[index], '}') && depth === 0) {
        close = index;
      } else if (isCharacter(atoms[index], '}')) {
        depth -= 1;
      } else if (isCharacter(atoms[index], ',') && depth === 0) {
        commas.push(index);
      }
    }
    if (close === -1) {
      continue;
    }
    const bounds = [open, ...commas, close];
    const alternatives =
      commas.length > 0
        ? bounds.slice(1).map((bound, index) => atoms.slice((bounds[index] ?? open) + 1, bound))
        : sequenceItems(atoms.slice(open + 1, close))?.map(characters);
    if (alternatives === undefined) {
      continue;
    }
    const prefix = atoms.slice(0, open);
    const suffix = atoms.slice(close + 1);
    const expanded = alternatives.flatMap((alternative) => expandBraces([...prefix, ...alternative, ...suffix]));
    return expanded.length > MAX_BRACE_WORDS ? [atoms] : expanded;
  }
  return [atoms];
}

/** The single value a variable holds in `scope`, `null` when unknown or when a loop gives it several. */
function valueOf(scope: Scope, name: string): readonly Piece[] | null {
  const values = scope.get(name);
  const [only] = values ?? [];
  return values?.length === 1 && only !== undefined ? only : null;
}

/** Whether `$IFS` still separates fields on blanks: nothing in the line assigned it. */
const defaultIfs = (scope: Scope, name: string): boolean => name === 'IFS' && !scope.has('IFS');

/** Pieces of a word expanded without field splitting or pathname expansion: assignments, here-documents. */
function joinedPieces(word: RawWord, scope: Scope, context: ShellContext): readonly Piece[] {
  return word.flatMap((part): readonly Piece[] => {
    switch (part.kind) {
      case 'text':
        return [{ kind: 'text', text: part.text, pattern: false }];
      case 'home':
        return context.home === null
          ? [{ kind: 'unknown', source: '~' }]
          : [{ kind: 'text', text: context.home, pattern: false }];
      case 'parameter':
        return defaultIfs(scope, part.name)
          ? [{ kind: 'text', text: ' ', pattern: false }]
          : (valueOf(scope, part.name) ?? [{ kind: 'unknown', source: `$${part.name}` }]);
      case 'substitution':
      case 'opaque':
        return [{ kind: 'unknown', source: part.source }];
    }
  });
}

type Field = { pieces: Piece[]; kept: boolean };

/** Words a raw word expands to: braces, then parameters, split into fields outside quotes. */
function expandWord(word: RawWord, scope: Scope, context: ShellContext): readonly Word[] {
  return expandBraces(atomsOf(word)).flatMap((atoms) => {
    const fields: Field[] = [{ pieces: [], kept: false }];
    const add = (piece: Piece): void => {
      const field = fields.at(-1);
      field?.pieces.push(piece);
      if (field !== undefined) {
        field.kept = true;
      }
    };
    for (const atom of atoms) {
      if (atom.kind === 'character') {
        add({ kind: 'text', text: atom.character, pattern: true });
      } else if (atom.part.kind !== 'parameter' || atom.part.quoted) {
        joinedPieces([atom.part], scope, context).forEach(add);
        if ('quoted' in atom.part && atom.part.quoted) {
          markKept(fields);
        }
      } else if (defaultIfs(scope, atom.part.name)) {
        fields.push({ pieces: [], kept: false });
      } else {
        const value = valueOf(scope, atom.part.name);
        if (value === null) {
          add({ kind: 'unknown', source: `$${atom.part.name}` });
          continue;
        }
        for (const piece of value) {
          if (piece.kind === 'unknown') {
            add(piece);
            continue;
          }
          piece.text.split(DEFAULT_IFS).forEach((text, index) => {
            if (index > 0) {
              fields.push({ pieces: [], kept: false });
            }
            if (text !== '') {
              add({ kind: 'text', text, pattern: true });
            }
          });
        }
      }
    }
    return fields.filter((field) => field.kept).map((field) => makeWord(field.pieces));
  });
}

/** A quoted empty string still makes a word. */
function markKept(fields: Field[]): void {
  const field = fields.at(-1);
  if (field !== undefined) {
    field.kept = true;
  }
}

/** The text of a raw word that is plain unquoted text, as reserved words are; `null` otherwise. */
const plainText = (word: RawWord | undefined): string | null =>
  word?.length === 1 && word[0]?.kind === 'text' && !word[0].quoted ? word[0].text : null;

const partScripts = (part: RawPart): readonly RawScript[] => {
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
};

function redirectionWords(redirection: RawRedirection): readonly RawWord[] {
  switch (redirection.kind) {
    case 'output':
    case 'input':
      return [redirection.target];
    case 'text':
      return [redirection.text.parts];
    case 'duplicate':
      return [];
  }
}

/** Every script nested in the parts of a raw command: they run before the command itself. */
const nestedScripts = (command: RawCommand): readonly RawScript[] =>
  [...command.words, ...command.redirections.flatMap(redirectionWords)].flatMap((word) => word.flatMap(partScripts));

/** Scopes in which each variable the command reads holds one value: one scope per combination of loop values. */
function bindingsOf(command: RawCommand, scope: Scope): readonly Scope[] {
  const names = new Set(
    [...command.words, ...command.redirections.flatMap(redirectionWords)].flatMap((word) =>
      word.flatMap((part) => (part.kind === 'parameter' ? [part.name] : [])),
    ),
  );
  let scopes: Scope[] = [scope];
  for (const name of names) {
    const values = scope.get(name);
    if (values === undefined || values === null || values.length <= 1) {
      continue;
    }
    scopes =
      scopes.length * values.length > MAX_BINDINGS
        ? scopes.map((bound) => new Map([...bound, [name, null]]))
        : scopes.flatMap((bound) => values.map((value) => new Map([...bound, [name, [value]]])));
  }
  return scopes;
}

function expandRedirection(redirection: RawRedirection, scope: Scope, context: ShellContext): Redirection | null {
  switch (redirection.kind) {
    case 'output': {
      const [target] = expandWord(redirection.target, scope, context);
      return target === undefined
        ? null
        : { kind: 'output', operator: redirection.operator, descriptor: redirection.descriptor, target };
    }
    case 'input': {
      const [target] = expandWord(redirection.target, scope, context);
      return target === undefined ? null : { kind: 'input', target };
    }
    case 'text': {
      const content = makeWord(joinedPieces(redirection.text.parts, scope, context));
      return { kind: 'text', source: redirection.text.source, content: isKnown(content) ? content.text : null };
    }
    case 'duplicate':
      return null;
  }
}

/** A word `NAME=value` read as an assignment, `null` when it is not one. */
function assignmentOf(word: Word): Assignment | null {
  const [head, ...tail] = word.pieces;
  const match = head?.kind === 'text' ? ASSIGNMENT.exec(head.text) : null;
  if (head?.kind !== 'text' || match?.[1] === undefined) {
    return null;
  }
  return {
    name: match[1],
    value: makeWord([{ kind: 'text', text: head.text.slice(match[0].length), pattern: false }, ...tail]),
  };
}

type Reading =
  | Readonly<{ kind: 'command'; command: SimpleCommand }>
  | Readonly<{ kind: 'loop'; name: string; values: Values }>
  | Readonly<{ kind: 'nothing' }>;

/** What a raw command amounts to in one scope: a simple command, a loop header, or nothing that runs. */
function readRawCommand(command: RawCommand, scope: Scope, context: ShellContext): Reading {
  let words = command.words;
  for (;;) {
    const head = plainText(words[0]);
    if (head !== null && RESERVED.has(head)) {
      words = words.slice(1);
    } else if (head === 'function') {
      words = words.slice(2);
    } else {
      break;
    }
  }
  const head = plainText(words[0]);
  if (head !== null && CONSTRUCTS.has(head)) {
    return { kind: 'nothing' };
  }
  const loopName = plainText(words[1]);
  if (head !== null && LOOPS.has(head)) {
    return loopName === null || !NAME.test(loopName)
      ? { kind: 'nothing' }
      : {
          kind: 'loop',
          name: loopName,
          values:
            plainText(words[2]) === 'in'
              ? words.slice(3).flatMap((word) => expandWord(word, scope, context).map((expanded) => expanded.pieces))
              : null,
        };
  }
  const assignments: Assignment[] = [];
  let index = 0;
  for (; index < words.length; index += 1) {
    const [first, ...rest] = words[index] ?? [];
    const match = first?.kind === 'text' && !first.quoted ? ASSIGNMENT.exec(first.text) : null;
    if (first?.kind !== 'text' || match?.[1] === undefined) {
      break;
    }
    const value: RawWord = [{ kind: 'text', text: first.text.slice(match[0].length), quoted: true }, ...rest];
    assignments.push({ name: match[1], value: makeWord(joinedPieces(value, scope, context)) });
  }
  return {
    kind: 'command',
    command: {
      assignments,
      words: words.slice(index).flatMap((word) => expandWord(word, scope, context)),
      redirections: command.redirections.flatMap((redirection) => expandRedirection(redirection, scope, context) ?? []),
    },
  };
}

type WrapperSpec = Readonly<{
  /** Options followed by a separate value. */
  values?: readonly string[];
  /** Options whose value is a whole command line. */
  scripts?: readonly string[];
  /** Words between the options and the wrapped command: `timeout DURATION`, `chroot DIRECTORY`. */
  operands?: number;
  /** `NAME=value` words after the options pass variables to the wrapped command. */
  assignments?: boolean;
  /** The wrapped words are joined and read by a shell. */
  joined?: boolean;
}>;

/** `npx` and the `exec` or `dlx` subcommand of a package runner. */
const RUNNER: WrapperSpec = { values: ['-p', '--package', '--filter', '-F', '-C', '--dir'], scripts: ['-c', '--call'] };

/** Commands that run the command given as their arguments. */
const WRAPPERS: Readonly<Record<string, WrapperSpec>> = {
  builtin: {},
  chrt: { operands: 1 },
  chroot: { values: ['--userspec', '--groups'], operands: 1 },
  command: {},
  doas: { values: ['-u', '-C'] },
  env: { values: ['-u', '--unset', '-C', '--chdir'], scripts: ['-S', '--split-string'], assignments: true },
  exec: { values: ['-a'] },
  flock: { values: ['-w', '--timeout', '-E', '--conflict-exit-code'], scripts: ['-c', '--command'], operands: 1 },
  ionice: { values: ['-c', '--class', '-n', '--classdata', '-p', '--pid', '-P', '--pgid', '-u', '--uid'] },
  nice: { values: ['-n', '--adjustment'] },
  nohup: {},
  npx: RUNNER,
  pkexec: { values: ['--user'] },
  run0: { values: ['-u', '--user', '-g', '--group', '-D', '--chdir', '--setenv', '--property'] },
  setsid: {},
  stdbuf: { values: ['-i', '-o', '-e', '--input', '--output', '--error'] },
  su: { values: ['-s', '--shell', '-g', '--group'], scripts: ['-c', '--command'] },
  sudo: {
    values: [
      '-u',
      '-g',
      '-h',
      '-p',
      '-C',
      '-D',
      '-R',
      '-T',
      '-U',
      '--user',
      '--group',
      '--host',
      '--prompt',
      '--chdir',
    ],
  },
  sudoedit: {},
  'systemd-run': {
    values: ['-p', '--property', '-u', '--unit', '-E', '--setenv', '--slice', '-M', '--machine', '--description'],
  },
  taskset: { values: ['-c', '--cpu-list'], operands: 1 },
  time: { values: ['-f', '--format', '-o', '--output'] },
  timeout: { values: ['-s', '--signal', '-k', '--kill-after'], operands: 1 },
  unbuffer: {},
  watch: { values: ['-n', '--interval'], joined: true },
  xargs: {
    values: ['-a', '--arg-file', '-d', '--delimiter', '-E', '-I', '-L', '--max-lines', '-n', '--max-args', '-P', '-s'],
  },
};

/** Package runners whose `exec` or `dlx` subcommand runs a command. */
const RUNNERS = new Set(['pnpm', 'npm', 'yarn', 'bun']);

const RUNNER_SUBCOMMANDS = new Set(['exec', 'dlx', 'x']);

const SHELLS = new Set(['sh', 'bash', 'dash', 'zsh', 'ksh', 'mksh', 'ash', 'fish']);

const SHELL_VALUE_OPTIONS = new Set(['-o', '+o', '-O', '+O', '--rcfile', '--init-file']);

const FIND_ACTIONS = new Set(['-exec', '-execdir', '-ok', '-okdir']);

type Unwrapped = Readonly<{ command: SimpleCommand | null; scripts: readonly string[] }>;

/** The command a wrapper runs, and the command lines its options carry. */
function unwrap(command: SimpleCommand, spec: WrapperSpec): Unwrapped {
  const words = command.words.slice(1);
  const scripts: string[] = [];
  const assignments: Assignment[] = [...command.assignments];
  let index = 0;
  for (let word = words[index]; word !== undefined; word = words[index]) {
    const { text } = word;
    const assignment = spec.assignments === true ? assignmentOf(word) : null;
    if (text === '--') {
      index += 1;
      break;
    }
    if (assignment !== null) {
      assignments.push(assignment);
      index += 1;
    } else if (spec.scripts?.includes(text) === true) {
      scripts.push(words[index + 1]?.text ?? '');
      index += 2;
    } else if (spec.scripts?.some((option) => text.startsWith(`${option}=`)) === true) {
      scripts.push(text.slice(text.indexOf('=') + 1));
      index += 1;
    } else if (spec.values?.includes(text) === true) {
      index += 2;
    } else if (text.startsWith('-') && text !== '-') {
      index += 1;
    } else {
      break;
    }
  }
  const rest = words.slice(index + (spec.operands ?? 0));
  if (spec.joined === true) {
    return { command: null, scripts: [...scripts, rest.map((word) => word.text).join(' ')] };
  }
  return {
    command: rest.length === 0 ? null : { assignments, words: rest, redirections: [] },
    scripts,
  };
}

/** The script a shell invocation runs when the line shows it: `-c SCRIPT`, or here-document input. */
function shellScript(command: SimpleCommand): string | null {
  const words = command.words.slice(1);
  let readsArgument = false;
  let index = 0;
  for (; index < words.length; index += 1) {
    const text = words[index]?.text ?? '';
    if (text === '--' || !/^[-+]./u.test(text)) {
      index += text === '--' ? 1 : 0;
      break;
    }
    if (SHELL_VALUE_OPTIONS.has(text)) {
      index += 1;
    } else if (!text.startsWith('--') && text.slice(1).includes('c')) {
      readsArgument = true;
    }
  }
  if (readsArgument) {
    return words[index]?.text ?? null;
  }
  if (index < words.length) {
    return null;
  }
  const input = command.redirections.find((redirection) => redirection.kind === 'text');
  return input?.kind === 'text' ? input.source : null;
}

/** Commands run by `find -exec` and its variants, `{}` kept as written. */
function findActions(command: SimpleCommand): readonly SimpleCommand[] {
  const actions: SimpleCommand[] = [];
  const { words } = command;
  for (let index = 1; index < words.length; index += 1) {
    if (!FIND_ACTIONS.has(words[index]?.text ?? '')) {
      continue;
    }
    const end = words.findIndex((word, position) => position > index && (word.text === ';' || word.text === '+'));
    const stop = end === -1 ? words.length : end;
    actions.push({ assignments: [], words: words.slice(index + 1, stop), redirections: [] });
    index = stop;
  }
  return actions;
}

/** What a command runs in turn: the wrapped command and the command lines it reads. */
function innerOf(command: SimpleCommand): Unwrapped {
  const name = programName(command);
  const spec = WRAPPERS[name];
  if (spec !== undefined) {
    return unwrap(command, spec);
  }
  if (RUNNERS.has(name)) {
    const subcommand = unwrap(command, { values: RUNNER.values ?? [] }).command;
    return subcommand !== null && RUNNER_SUBCOMMANDS.has(subcommand.words[0]?.text ?? '')
      ? unwrap(subcommand, RUNNER)
      : { command: null, scripts: [] };
  }
  if (name === 'busybox') {
    return { command: { ...command, words: command.words.slice(1) }, scripts: [] };
  }
  if (SHELLS.has(name)) {
    const script = shellScript(command);
    return { command: null, scripts: script === null ? [] : [script] };
  }
  if (name === 'eval') {
    return {
      command: null,
      scripts: [
        command.words
          .slice(1)
          .map((word) => word.text)
          .join(' '),
      ],
    };
  }
  return { command: null, scripts: [] };
}

function readInto(script: RawScript, scope: Scope, context: ShellContext, depth: number, out: SimpleCommand[]): void {
  if (depth > MAX_DEPTH) {
    return;
  }
  for (const raw of script) {
    for (const nested of nestedScripts(raw)) {
      readInto(nested, new Map(scope), context, depth + 1, out);
    }
    for (const bound of bindingsOf(raw, scope)) {
      const reading = readRawCommand(raw, bound, context);
      switch (reading.kind) {
        case 'nothing':
          break;
        case 'loop':
          scope.set(reading.name, reading.values);
          break;
        case 'command':
          record(reading.command, scope);
          emit(reading.command, scope, context, depth, out);
          break;
      }
    }
  }
}

/** Variables a command sets for the rest of the line. */
function record(command: SimpleCommand, scope: Scope): void {
  const [first, ...args] = command.words.map((word) => word.text);
  const name = first === undefined ? undefined : programName(command);
  if (name === undefined) {
    command.assignments.forEach((assignment) => scope.set(assignment.name, [assignment.value.pieces]));
  } else if (DECLARATIONS.has(name)) {
    for (const word of command.words.slice(1)) {
      const assignment = assignmentOf(word);
      if (assignment !== null) {
        scope.set(assignment.name, [assignment.value.pieces]);
      }
    }
  } else if (name === 'unset') {
    args.filter((arg) => NAME.test(arg)).forEach((arg) => scope.set(arg, [[]]));
  } else if (name === 'read') {
    args.filter((arg) => NAME.test(arg)).forEach((arg) => scope.set(arg, null));
  }
}

function emit(command: SimpleCommand, scope: Scope, context: ShellContext, depth: number, out: SimpleCommand[]): void {
  if (command.words.length === 0 && command.assignments.length === 0 && command.redirections.length === 0) {
    return;
  }
  out.push(command);
  if (depth > MAX_DEPTH || command.words.length === 0) {
    return;
  }
  const inner = innerOf(command);
  if (inner.command !== null) {
    emit(inner.command, scope, context, depth + 1, out);
  }
  for (const script of inner.scripts) {
    readInto(readCommandLine(script), new Map(scope), context, depth + 1, out);
  }
  if (programName(command) === 'find') {
    findActions(command).forEach((action) => {
      emit(action, scope, context, depth + 1, out);
    });
  }
}

/** Every simple command of a command line, in the order they run, wrapped and nested commands included. */
export function readCommands(line: string, context: ShellContext): readonly SimpleCommand[] {
  const commands: SimpleCommand[] = [];
  readInto(readCommandLine(line), new Map(), context, 0, commands);
  return commands;
}

/** The text of each word: what most rules compare. */
export const argv = (command: SimpleCommand): readonly string[] => command.words.map((word) => word.text);

/**
 * The program a command runs, by its base name: `/usr/bin/git`, `\\git` and `"git"` all name `git`. A rule that
 * compares the first word as written is disarmed by an absolute path, so every rule reads this name instead.
 */
export const programName = (command: SimpleCommand): string => basename(command.words[0]?.text ?? '');

/** A program the line does not spell out: the guard cannot name what it would run, so no rule can clear it. */
export const hasOpaqueProgram = (command: SimpleCommand): boolean => {
  const [program] = command.words;
  return program !== undefined && !isKnown(program);
};
