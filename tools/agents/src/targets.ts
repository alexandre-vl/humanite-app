import { join, resolve } from 'node:path';
import type { SimpleCommand } from './shell/commands.ts';
import type { Word } from './shell/words.ts';
import { hasKnownText, isKnown, isPattern, makeWord, pathSegments, wordSource } from './shell/words.ts';

/** What the guard may read of the file system to know which files a command designates. */
export type FileSystemView = Readonly<{
  /** Names in a directory, `null` when the path is not a readable directory. */
  listDirectory: (absolutePath: string) => Promise<readonly string[] | null>;
}>;

/** Directories the commands of one line may run in; `uncertain` when a `cd` goes where the line does not tell. */
export type Directories = Readonly<{ known: readonly string[]; uncertain: boolean }>;

/** Files a word designates: `paths` it names or matches, and a `pattern` for what it may name without saying. */
export type Designation = Readonly<{ paths: readonly string[]; pattern: RegExp | null }>;

/** Most files one pattern is expanded to; a pattern matching more is judged on the first ones. */
const MAX_MATCHES = 512;

/** Most directories followed for one line; a line with more `cd` than that is judged on the first ones. */
const MAX_DIRECTORIES = 32;

const DIRECTORY_CHANGES = new Set(['cd', 'pushd']);

/** The session directory, and every directory a `cd` or `pushd` of the line may move to, whatever the order. */
export function lineDirectories(commands: readonly SimpleCommand[], cwd: string, home: string | null): Directories {
  const known = [cwd];
  let uncertain = false;
  for (const command of commands) {
    if (!DIRECTORY_CHANGES.has(command.words[0]?.text ?? '')) {
      continue;
    }
    const destination = command.words.slice(1).find((word) => !/^-[LPe@]+$/u.test(word.text));
    if (destination === undefined) {
      known.push(...(home === null ? [] : [home]));
      uncertain ||= home === null;
    } else if (isKnown(destination) && !isPattern(destination) && destination.text !== '-') {
      known.push(...known.map((directory) => resolve(directory, destination.text)).slice(0, MAX_DIRECTORIES));
    } else {
      uncertain = true;
    }
  }
  return { known: [...new Set(known)], uncertain };
}

/** Existing files matching an absolute pattern word, segment by segment as pathname expansion reads them. */
async function expandPattern(word: Word, view: FileSystemView): Promise<readonly string[]> {
  const segments = pathSegments(word);
  if (segments === null) {
    return [];
  }
  let current = ['/'];
  for (const segment of segments) {
    if (segment.text === '') {
      continue;
    }
    if (!isPattern(segment)) {
      current = current.map((directory) => join(directory, segment.text));
      continue;
    }
    const matcher = new RegExp(`^${wordSource(segment)}$`, 'u');
    const hidden = segment.text.startsWith('.');
    const next: string[] = [];
    for (const directory of current) {
      const names = (await view.listDirectory(directory)) ?? [];
      next.push(
        ...names
          .filter((name) => matcher.test(name) && (hidden || !name.startsWith('.')))
          .map((name) => join(directory, name)),
      );
    }
    current = next.slice(0, MAX_MATCHES);
  }
  return current;
}

const inDirectory = (directory: string, word: Word): Word =>
  makeWord([{ kind: 'text', text: `${directory}/`, pattern: false }, ...word.pieces]);

/** Directories a relative word starts from: those of the line, moved by the command's own base when it sets one. */
function basesOf(base: Word | null, directories: Directories): Directories {
  if (base === null) {
    return directories;
  }
  if (!isKnown(base) || isPattern(base)) {
    return { known: [], uncertain: true };
  }
  return {
    known: directories.known.map((directory) => resolve(directory, base.text)),
    uncertain: directories.uncertain,
  };
}

/** The files a target word designates, from the directories the command may run in. */
export async function designate(
  word: Word,
  base: Word | null,
  directories: Directories,
  view: FileSystemView,
): Promise<Designation> {
  if (!hasKnownText(word)) {
    return { paths: [], pattern: null };
  }
  const bases = basesOf(base, directories);
  const absolute = word.pieces[0]?.kind === 'text' && word.pieces[0].text.startsWith('/');
  const anywhere = (source: string): RegExp =>
    new RegExp(absolute || word.pieces[0]?.kind === 'unknown' ? `^${source}$` : `(?:^|/)${source}$`, 'u');
  if (!isKnown(word)) {
    return { paths: [], pattern: anywhere(wordSource(word)) };
  }
  const pattern = bases.uncertain && !absolute ? anywhere(wordSource(word)) : null;
  const starts = absolute ? [''] : bases.known;
  if (!isPattern(word)) {
    return { paths: starts.map((start) => (absolute ? word.text : resolve(start, word.text))), pattern };
  }
  const paths: string[] = [];
  for (const start of starts) {
    const matches = await expandPattern(absolute ? word : inDirectory(start, word), view);
    paths.push(...(matches.length > 0 ? matches : [absolute ? word.text : resolve(start, word.text)]));
  }
  return { paths: [...new Set(paths)], pattern };
}
