import { basename } from 'node:path';
import type { SimpleCommand } from './shell/commands.ts';
import type { Word } from './shell/words.ts';
import { isKnown, literalWord, makeWord } from './shell/words.ts';

/**
 * The files a simple command writes, as far as its words tell: output redirections, and the file operands of the
 * commands that write, move, remove, link or change files. A command missing from the table writes nothing the
 * guard can see; `pnpm verify` and the git hooks judge the result instead.
 */

export type WriteEffect =
  /** The file gets `content`, `null` when the line does not tell it; `append` adds it after the current content. */
  | Readonly<{ kind: 'content'; content: string | null; append: boolean }>
  /** The file gets the content of another file. */
  | Readonly<{ kind: 'copy'; source: Word }>
  /** The path disappears, with everything below it. */
  | Readonly<{ kind: 'remove' }>
  /** Files below the path may be written or removed; `names` narrows them to matching base names. */
  | Readonly<{ kind: 'tree'; names: readonly Word[] | null }>
  /** The path gets another name, through which it can later be written without the guard seeing it. */
  | Readonly<{ kind: 'alias' }>
  /** Mode, owner or times change; the content stays. */
  | Readonly<{ kind: 'metadata' }>;

export type WriteTarget = Readonly<{
  path: Word;
  /** Directory a relative path starts from when the command sets one (`git -C`); `null` for the line's. */
  base: Word | null;
  effect: WriteEffect;
}>;

type Options = Readonly<{
  operands: readonly Word[];
  flags: ReadonlySet<string>;
  values: ReadonlyMap<string, readonly Word[]>;
}>;

type OptionSpec = Readonly<{
  /** Options that take a value: the rest of a short cluster or the next word; `--name=value` always works. */
  values?: readonly string[];
  /** Short options whose value, possibly empty, is only the rest of their cluster (`sed -i.bak`). */
  attached?: readonly string[];
}>;

/** The word without its first `count` characters, pieces kept. */
function dropStart(word: Word, count: number): Word {
  let dropped = 0;
  return makeWord(
    word.pieces.map((piece) => {
      if (piece.kind === 'unknown') {
        return piece;
      }
      const drop = Math.max(0, Math.min(piece.text.length, count - dropped));
      dropped += drop;
      return { ...piece, text: piece.text.slice(drop) };
    }),
  );
}

/** GNU-style option parsing: short clusters, attached values, `--name=value`, `--` before operands only. */
function parseOptions(words: readonly Word[], spec: OptionSpec): Options {
  const operands: Word[] = [];
  const flags = new Set<string>();
  const values = new Map<string, Word[]>();
  const addValue = (name: string, value: Word | undefined): void => {
    values.set(name, [...(values.get(name) ?? []), ...(value === undefined ? [] : [value])]);
  };
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word === undefined) {
      break;
    }
    const { text } = word;
    if (text === '--') {
      operands.push(...words.slice(index + 1));
      break;
    }
    if (text === '-' || !text.startsWith('-') || !isKnown(word)) {
      operands.push(word);
    } else if (text.startsWith('--')) {
      const equals = text.indexOf('=');
      if (equals !== -1) {
        addValue(text.slice(0, equals), dropStart(word, equals + 1));
      } else if (spec.values?.includes(text) === true) {
        addValue(text, words[index + 1]);
        index += 1;
      } else {
        flags.add(text);
      }
    } else {
      for (let position = 1; position < text.length; position += 1) {
        const name = `-${text.charAt(position)}`;
        const rest = position + 1 < text.length;
        if (spec.attached?.includes(name) === true) {
          addValue(name, dropStart(word, position + 1));
          break;
        }
        if (spec.values?.includes(name) === true) {
          addValue(name, rest ? dropStart(word, position + 1) : words[index + 1]);
          index += rest ? 0 : 1;
          break;
        }
        flags.add(name);
      }
    }
  }
  return { operands, flags, values };
}

const has = (options: Options, ...names: readonly string[]): boolean =>
  names.some((name) => options.flags.has(name) || options.values.has(name));

const valuesOf = (options: Options, ...names: readonly string[]): readonly Word[] =>
  names.flatMap((name) => options.values.get(name) ?? []);

const target = (path: Word, effect: WriteEffect, base: Word | null = null): WriteTarget => ({ path, base, effect });

const UNKNOWN_CONTENT: WriteEffect = { kind: 'content', content: null, append: false };

const REMOVE: WriteEffect = { kind: 'remove' };

const METADATA: WriteEffect = { kind: 'metadata' };

const ALIAS: WriteEffect = { kind: 'alias' };

const TREE: WriteEffect = { kind: 'tree', names: null };

const joinPath = (directory: Word, name: string): Word =>
  makeWord([...directory.pieces, { kind: 'text', text: `/${name}`, pattern: false }]);

const TARGET_DIRECTORY = ['-t', '--target-directory'];

const NO_TARGET_DIRECTORY = ['-T', '--no-target-directory'];

type Placement = Readonly<{ sources: readonly Word[]; targets: readonly WriteTarget[] }>;

/**
 * Where `cp`, `mv`, `install` and `ln` put their sources: into `-t DIRECTORY`, else at the last operand, which is a
 * file for a single source and may be a directory holding each source under its own name.
 */
function place(options: Options, effectOf: (source: Word) => WriteEffect): Placement {
  const [directory] = valuesOf(options, ...TARGET_DIRECTORY);
  if (directory !== undefined) {
    return {
      sources: options.operands,
      targets: options.operands.map((source) => target(joinPath(directory, basename(source.text)), effectOf(source))),
    };
  }
  const sources = options.operands.slice(0, -1);
  const destination = options.operands.at(-1);
  const [only] = sources;
  if (destination === undefined) {
    return { sources: [], targets: [] };
  }
  const asFile = sources.length === 1 && only !== undefined ? [target(destination, effectOf(only))] : [];
  const intoDirectory = has(options, ...NO_TARGET_DIRECTORY)
    ? []
    : sources.map((source) => target(joinPath(destination, basename(source.text)), effectOf(source)));
  return { sources, targets: [...asFile, ...intoDirectory] };
}

/** A command and the words after its name. */
type WriterCall = Readonly<{ command: SimpleCommand; args: readonly Word[] }>;

type Writer = (call: WriterCall) => readonly WriteTarget[];

/** Standard input written in the line, when its text is known. */
function inputText(command: SimpleCommand): string | null {
  const input = command.redirections.findLast((redirection) => redirection.kind === 'text');
  return input?.kind === 'text' ? input.content : null;
}

const RECURSIVE = ['-r', '-R', '-a', '--recursive', '--archive'];

const COPY_SPEC: OptionSpec = { values: [...TARGET_DIRECTORY, '-S', '--suffix'] };

const INSTALL_SPEC: OptionSpec = {
  values: [...TARGET_DIRECTORY, '-S', '--suffix', '-m', '--mode', '-o', '--owner', '-g', '--group'],
};

function copyTargets(args: readonly Word[], spec: OptionSpec): readonly WriteTarget[] {
  const options = parseOptions(args, spec);
  const recursive = has(options, ...RECURSIVE);
  return place(options, (source): WriteEffect => (recursive ? TREE : { kind: 'copy', source })).targets;
}

function moveTargets(args: readonly Word[]): readonly WriteTarget[] {
  const options = parseOptions(args, COPY_SPEC);
  const moved = place(options, (source): WriteEffect => ({ kind: 'copy', source }));
  return [...moved.sources.map((source) => target(source, REMOVE)), ...moved.targets];
}

const operandsWith =
  (effect: WriteEffect, spec: OptionSpec = {}, skipped = 0): Writer =>
  ({ args }) =>
    parseOptions(args, spec)
      .operands.slice(skipped)
      .map((path) => target(path, effect));

/** `sed -i` and `perl -i`: the operands after the script, or all of them when the script is an option value. */
const inPlaceEditor =
  (spec: OptionSpec, inPlace: readonly string[], scriptOptions: readonly string[]): Writer =>
  ({ args }) => {
    const options = parseOptions(args, spec);
    if (!has(options, ...inPlace)) {
      return [];
    }
    const files = has(options, ...scriptOptions) ? options.operands : options.operands.slice(1);
    return files.map((path) => target(path, UNKNOWN_CONTENT));
  };

const FIND_GLOBAL_OPTIONS = /^-(?:[HLP]|O\d|D)$/u;

const FIND_ACTIONS = new Set(['-exec', '-execdir', '-ok', '-okdir']);

const FIND_OUTPUTS = new Set(['-fprint', '-fprint0', '-fprintf', '-fls']);

const FIND_ALTERNATIVES = new Set(['-o', '-or', '!', '-not', ',', '(']);

/**
 * `find`: files named by its output actions, and a tree below each start path when it deletes or runs a writing
 * command on `{}`; `-name` and `-iname` narrow the tree unless the expression has alternatives or negations.
 */
const findWriter: Writer = ({ args }) => {
  let index = 0;
  while (FIND_GLOBAL_OPTIONS.test(args[index]?.text ?? '')) {
    index += args[index]?.text === '-D' ? 2 : 1;
  }
  const starts: Word[] = [];
  for (let word = args[index]; word !== undefined && !/^[-(!),]/u.test(word.text); word = args[index]) {
    starts.push(word);
    index += 1;
  }
  const names: Word[] = [];
  const outputs: WriteTarget[] = [];
  let narrowed = true;
  let writesBelow = false;
  for (; index < args.length; index += 1) {
    const token = args[index]?.text ?? '';
    const operand = args[index + 1];
    if (token === '-delete') {
      writesBelow = true;
    } else if ((token === '-name' || token === '-iname') && operand !== undefined) {
      names.push(operand);
      index += 1;
    } else if (FIND_ALTERNATIVES.has(token)) {
      narrowed = false;
    } else if (FIND_OUTPUTS.has(token) && operand !== undefined) {
      outputs.push(target(operand, UNKNOWN_CONTENT));
      index += 1;
    } else if (FIND_ACTIONS.has(token)) {
      const end = args.findIndex((word, position) => position > index && (word.text === ';' || word.text === '+'));
      const stop = end === -1 ? args.length : end;
      const action: SimpleCommand = { assignments: [], words: args.slice(index + 1, stop), redirections: [] };
      writesBelow ||= commandTargets(action).some(({ path }) => path.text.includes(PLACEHOLDER));
      index = stop;
    }
  }
  const tree: WriteEffect = { kind: 'tree', names: narrowed && names.length > 0 ? names : null };
  const roots = starts.length === 0 ? [literalWord('.')] : starts;
  return [...outputs, ...(writesBelow ? roots.map((root) => target(root, tree)) : [])];
};

const GIT_VALUE_OPTIONS = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--config-env',
  '--exec-path',
]);

/** `git mv`, `git rm` and `git config --file`, relative to the `-C` directories. */
const gitWriter: Writer = ({ args }) => {
  let index = 0;
  let base: Word | null = null;
  while ((args[index]?.text ?? '').startsWith('-')) {
    const option = args[index]?.text ?? '';
    const value = args[index + 1];
    if (option === '-C' && value !== undefined) {
      base = base === null || value.text.startsWith('/') ? value : joinPath(base, value.text);
    }
    index += GIT_VALUE_OPTIONS.has(option) ? 2 : 1;
  }
  const rest = args.slice(index + 1);
  const relative = (targets: readonly WriteTarget[]): readonly WriteTarget[] =>
    targets.map((written) => ({ ...written, base }));
  switch (args[index]?.text ?? '') {
    case 'mv':
      return relative(moveTargets(rest));
    case 'rm': {
      const options = parseOptions(rest, {});
      return has(options, '--cached') ? [] : relative(options.operands.map((path) => target(path, REMOVE)));
    }
    case 'config':
      return relative(
        valuesOf(parseOptions(rest, { values: ['--file', '-f', '--blob'] }), '--file', '-f').map((path) =>
          target(path, UNKNOWN_CONTENT),
        ),
      );
    default:
      return [];
  }
};

/** Options of `chmod`; any other word starting with `-` is a mode such as `-x`. */
const CHMOD_OPTION = /^(?:-[Rcfv]+|--(?:recursive|changes|silent|quiet|verbose|(?:no-)?preserve-root|reference=.*))$/u;

const CURL_OUTPUTS = [
  '-o',
  '--output',
  '-D',
  '--dump-header',
  '-c',
  '--cookie-jar',
  '--trace',
  '--trace-ascii',
  '--stderr',
];

const WGET_OUTPUTS = ['-O', '--output-document', '-o', '--output-file', '-a', '--append-output'];

const WGET_DIRECTORIES = ['-P', '--directory-prefix'];

const PATCH_SPEC: OptionSpec = {
  values: [
    '-o',
    '--output',
    '-i',
    '--input',
    '-d',
    '--directory',
    '-r',
    '--reject-file',
    '-F',
    '-V',
    '-Y',
    '-z',
    '-D',
    '-B',
  ],
  attached: ['-p'],
};

const WRITERS: Readonly<Record<string, Writer>> = {
  chattr: ({ args }) => args.filter((word) => !/^[-+=]/u.test(word.text)).map((path) => target(path, METADATA)),
  chgrp: operandsWith(METADATA, {}, 1),
  chmod: ({ args }) => {
    const operands = args.filter((word) => !CHMOD_OPTION.test(word.text));
    const byReference = args.some((word) => word.text.startsWith('--reference='));
    return operands.slice(byReference ? 0 : 1).map((path) => target(path, METADATA));
  },
  chown: operandsWith(METADATA, {}, 1),
  cp: ({ args }) => copyTargets(args, COPY_SPEC),
  curl: ({ args }) =>
    valuesOf(parseOptions(args, { values: CURL_OUTPUTS }), ...CURL_OUTPUTS).map((path) =>
      target(path, UNKNOWN_CONTENT),
    ),
  dd: ({ args }) =>
    args.filter((word) => word.text.startsWith('of=')).map((word) => target(dropStart(word, 3), UNKNOWN_CONTENT)),
  find: findWriter,
  git: gitWriter,
  install: ({ args }) => {
    const options = parseOptions(args, INSTALL_SPEC);
    return has(options, '-d', '--directory')
      ? options.operands.map((path) => target(path, METADATA))
      : copyTargets(args, INSTALL_SPEC);
  },
  ln: ({ args }) => {
    const options = parseOptions(args, COPY_SPEC);
    const single = options.operands.length === 1 && !has(options, ...TARGET_DIRECTORY);
    const linked = place(options, () => UNKNOWN_CONTENT);
    const [source] = options.operands;
    return single && source !== undefined
      ? [target(literalWord(basename(source.text)), UNKNOWN_CONTENT), target(source, ALIAS)]
      : [...linked.targets, ...linked.sources.map((path) => target(path, ALIAS))];
  },
  mkdir: operandsWith(METADATA, { values: ['-m', '--mode', '--context'] }),
  mv: ({ args }) => moveTargets(args),
  patch: ({ args }) => {
    const options = parseOptions(args, PATCH_SPEC);
    const [file] = options.operands;
    const [output = file] = valuesOf(options, '-o', '--output');
    return output === undefined ? [] : [target(output, UNKNOWN_CONTENT)];
  },
  perl: inPlaceEditor(
    { values: ['-e', '-E'], attached: ['-i', '-M', '-m', '-I', '-x', '-C', '-d', '-D', '-0', '-l'] },
    ['-i'],
    ['-e', '-E'],
  ),
  rm: operandsWith(REMOVE),
  rmdir: operandsWith(REMOVE),
  rsync: ({ args }) =>
    parseOptions(args, { values: ['-e', '--rsh', '--exclude', '--include', '--filter', '-f'] })
      .operands.slice(-1)
      .map((path) => target(path, TREE)),
  sed: inPlaceEditor(
    { values: ['-e', '--expression', '-f', '--file', '-l', '--line-length'], attached: ['-i'] },
    ['-i', '--in-place'],
    ['-e', '--expression', '-f', '--file'],
  ),
  shred: ({ args }) => {
    const options = parseOptions(args, { values: ['-n', '--iterations', '-s', '--size', '--random-source'] });
    return options.operands.map((path) => target(path, has(options, '-u', '--remove') ? REMOVE : UNKNOWN_CONTENT));
  },
  sponge: ({ command, args }) =>
    parseOptions(args, { attached: ['-a'] }).operands.map((path) =>
      target(path, { kind: 'content', content: inputText(command), append: false }),
    ),
  tar: ({ args }) => {
    const options = parseOptions(args, {
      values: ['-C', '--directory', '-f', '--file', '-T', '--files-from', '-X', '--exclude-from'],
    });
    const extracts = has(options, '-x', '--extract', '--get') || /^[^-]*x/u.test(args[0]?.text ?? '');
    const [directory = literalWord('.')] = valuesOf(options, '-C', '--directory');
    return extracts ? [target(directory, TREE)] : [];
  },
  tee: ({ command, args }) => {
    const options = parseOptions(args, {});
    const append = has(options, '-a', '--append');
    return options.operands.map((path) => target(path, { kind: 'content', content: inputText(command), append }));
  },
  touch: operandsWith(METADATA, { values: ['-r', '--reference', '-d', '--date', '-t'] }),
  truncate: operandsWith(UNKNOWN_CONTENT, { values: ['-s', '--size', '-r', '--reference'] }),
  unlink: operandsWith(REMOVE),
  unzip: ({ args }) => {
    const [directory = literalWord('.')] = valuesOf(parseOptions(args, { values: ['-d', '-x'] }), '-d');
    return [target(directory, TREE)];
  },
  wget: ({ args }) => {
    const options = parseOptions(args, { values: [...WGET_OUTPUTS, ...WGET_DIRECTORIES] });
    return [
      ...valuesOf(options, ...WGET_OUTPUTS).map((path) => target(path, UNKNOWN_CONTENT)),
      ...valuesOf(options, ...WGET_DIRECTORIES).map((path) => target(path, TREE)),
    ];
  },
};

const PRINTF_ESCAPES: Readonly<Record<string, string>> = { n: '\n', t: '\t', '\\': '\\', '"': '"', "'": "'" };

/** `printf` output for a format using only `%s`, `%%` and common escapes, repeated over its arguments; else `null`. */
function printfOutput(format: string, args: readonly string[]): string | null {
  let output = '';
  let used = 0;
  do {
    for (let index = 0; index < format.length; index += 1) {
      const character = format.charAt(index);
      const next = format.charAt(index + 1);
      if (character === '\\') {
        const escaped = PRINTF_ESCAPES[next];
        if (escaped === undefined) {
          return null;
        }
        output += escaped;
        index += 1;
      } else if (character === '%' && (next === '%' || next === 's')) {
        output += next === '%' ? '%' : (args[used] ?? '');
        used += next === 's' ? 1 : 0;
        index += 1;
      } else if (character === '%') {
        return null;
      } else {
        output += character;
      }
    }
  } while (used < args.length && format.includes('%s'));
  return output;
}

/** What a command prints on its standard output when its words tell it exactly: `echo`, `printf`, `cat` of a here-document. */
function printedText(command: SimpleCommand): string | null {
  if (!command.words.every(isKnown)) {
    return null;
  }
  const [name = '', ...args] = command.words.map((word) => word.text);
  switch (name) {
    case 'echo': {
      const first = args.findIndex((arg) => !/^-[neE]+$/u.test(arg));
      const end = first === -1 ? args.length : first;
      const options = args.slice(0, end).join('');
      const printed = args.slice(end).join(' ');
      return options.includes('e') && printed.includes('\\') ? null : `${printed}${options.includes('n') ? '' : '\n'}`;
    }
    case 'printf':
      return args[0] === undefined ? null : printfOutput(args[0], args.slice(1));
    case 'cat':
      return args.every((arg) => arg === '-') ? inputText(command) : null;
    default:
      return null;
  }
}

/** The name `find -exec` and `xargs -I` replace with each file: the tree of the `find` stands for it. */
const PLACEHOLDER = '{}';

/** Every file a simple command writes that its words name. */
export const writeTargets = (command: SimpleCommand): readonly WriteTarget[] =>
  commandTargets(command).filter(({ path }) => !path.text.includes(PLACEHOLDER));

function commandTargets(command: SimpleCommand): readonly WriteTarget[] {
  const printed = printedText(command);
  const redirected = command.redirections.flatMap((redirection): readonly WriteTarget[] => {
    if (redirection.kind !== 'output') {
      return [];
    }
    const append = redirection.operator === '>>' || redirection.operator === '&>>';
    const stdout = redirection.descriptor === null || redirection.descriptor === 1;
    const content = redirection.operator === '<>' || !stdout ? null : printed;
    return [target(redirection.target, { kind: 'content', content, append })];
  });
  const [name, ...args] = command.words;
  const writer = name === undefined ? undefined : WRITERS[basename(name.text)];
  return [...redirected, ...(writer?.({ command, args }) ?? [])];
}
