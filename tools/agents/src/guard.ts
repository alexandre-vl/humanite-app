import { basename, dirname, join, resolve } from 'node:path';
import type { GuardVerdict } from '@huma/adr/guard';
import { ALLOW, DECIDED_FROZEN, isAdrFilePath, judgeAdrWrite, looksDecided } from '@huma/adr/guard';
import { ADR_DIRECTORY } from '@huma/adr/layout';
import type { JsonObject } from '@huma/kit/json';
import { arrayField, isJsonObject, objectField, stringField } from '@huma/kit/json';
import { toRepoPath } from '@huma/kit/paths';
import type { FileEdit } from './edit.ts';
import { contentAfterEdit, contentAfterMultiEdit } from './edit.ts';
import type { AgentPolicy, PathRule } from './policy.ts';
import { coversPath, GIT_SENSITIVE_NAMES } from './policy.ts';
import type { SimpleCommand } from './shell/commands.ts';
import { readCommands } from './shell/commands.ts';
import { globSource } from './shell/words.ts';
import type { Directories, FileSystemView } from './targets.ts';
import { designate, lineDirectories } from './targets.ts';
import type { WriteEffect, WriteTarget } from './writes.ts';
import { writeTargets } from './writes.ts';

export type GuardContext = FileSystemView &
  Readonly<{
    policy: AgentPolicy;
    /** Home directory of the user, for `~` in commands; `null` when unknown. */
    home: string | null;
    /** Root of the workspace that holds `absolutePath`, `null` outside any workspace. */
    findRoot: (absolutePath: string) => Promise<string | null>;
    /** File content, `null` when the file does not exist or is not readable. */
    readFile: (absolutePath: string) => Promise<string | null>;
    /** The path with the symbolic links of its existing part resolved. */
    realPath: (absolutePath: string) => Promise<string>;
  }>;

const deny = (reason: string): GuardVerdict => ({ kind: 'deny', reason });

const SHELL_UNKNOWN_CONTENT =
  'Contenu de l’ADR après cette commande incalculable : écrire un ADR proposé avec les outils Write ou Edit, que la garde sait juger.';

const ADR_TREE =
  'Cette commande écrit ou supprime en bloc dans le dossier des ADR : un ADR décidé ne change plus et un ADR commité ne se supprime pas.';

const ADR_ALIAS =
  'Un lien vers un ADR permettrait de l’écrire sans que la garde le voie : modifier l’ADR lui-même avec Write ou Edit.';

/** A path is the area or lies below it. */
const within = (path: string, area: string): boolean => path === area || path.startsWith(`${area}/`);

/** A path is the area or one of its parents: removing it removes the area. */
const holds = (path: string, area: string): boolean => path === '' || within(area, path);

/** Whether a tree write narrowed to some base names can reach one of `names`. */
function reachesNames(effect: WriteEffect, names: readonly string[]): boolean {
  if (effect.kind !== 'tree' || effect.names === null) {
    return true;
  }
  const matchers = effect.names.map((name) => new RegExp(`^${globSource(name)}$`, 'iu'));
  return names.some((name) => matchers.some((matcher) => matcher.test(name)));
}

/** Base names a wide write must not reach below a protected area. */
const sensitiveNames = (rule: PathRule): readonly string[] =>
  rule.kind === 'directory' ? [basename(rule.path), ...GIT_SENSITIVE_NAMES] : [basename(rule.path)];

/** Whether the rule refuses this effect: a file it only protects from being forged may still be removed. */
const refuses = (rule: PathRule, effect: WriteEffect): boolean =>
  rule.removal === 'refused' || (effect.kind !== 'remove' && effect.kind !== 'tree');

type Write = Readonly<{ root: string; path: string; absolute: string; effect: WriteEffect }>;

/** Verdict on an ADR file receiving `after`, where `null` means content the command does not tell. */
function judgeShellAdrWrite(before: string | null, after: string | null): GuardVerdict {
  if (after !== null) {
    return judgeAdrWrite(before, after);
  }
  return deny(before !== null && looksDecided(before) ? DECIDED_FROZEN : SHELL_UNKNOWN_CONTENT);
}

async function adrNames(root: string, context: GuardContext): Promise<readonly string[]> {
  const names = (await context.listDirectory(join(root, ADR_DIRECTORY))) ?? [];
  return [...names.filter((name) => isAdrFilePath(`${ADR_DIRECTORY}/${name}`)), '0000-adr.md'];
}

/** Verdict on one write to a repository path (`''` for the root), whatever tool or command makes it. */
async function judgeWrite(
  write: Write,
  context: GuardContext,
  sourceContent: () => Promise<string | null>,
): Promise<GuardVerdict> {
  const { path, effect } = write;
  const wide = effect.kind === 'remove' || effect.kind === 'tree';
  for (const rule of context.policy.paths) {
    const reached =
      coversPath(rule, path) || (wide && holds(path, rule.path) && reachesNames(effect, sensitiveNames(rule)));
    if (reached && refuses(rule, effect)) {
      return deny(rule.reason);
    }
  }
  if (wide && holds(path, ADR_DIRECTORY) && reachesNames(effect, await adrNames(write.root, context))) {
    return deny(ADR_TREE);
  }
  if (!isAdrFilePath(path)) {
    return ALLOW;
  }
  const before = await context.readFile(write.absolute);
  switch (effect.kind) {
    case 'metadata':
      return ALLOW;
    case 'alias':
      return deny(ADR_ALIAS);
    case 'remove':
      return before !== null && looksDecided(before) ? deny(DECIDED_FROZEN) : ALLOW;
    case 'tree':
      return judgeShellAdrWrite(before, null);
    case 'content':
      return judgeShellAdrWrite(
        before,
        effect.content === null ? null : `${effect.append ? (before ?? '') : ''}${effect.content}`,
      );
    case 'copy':
      return judgeShellAdrWrite(before, await sourceContent());
  }
}

/** Verdict on a write to an absolute path, judged at the path and, through symbolic links, where it really lands. */
async function judgeAbsoluteWrite(
  absolute: string,
  effect: WriteEffect,
  context: GuardContext,
  sourceContent: () => Promise<string | null>,
): Promise<GuardVerdict> {
  for (const candidate of new Set([absolute, await context.realPath(absolute)])) {
    const root = await context.findRoot(candidate);
    if (root === null) {
      continue;
    }
    const path = candidate === root ? '' : toRepoPath(root, candidate);
    if (path === null) {
      continue;
    }
    const verdict = await judgeWrite({ root, path, absolute: candidate, effect }, context, sourceContent);
    if (verdict.kind === 'deny') {
      return verdict;
    }
  }
  return ALLOW;
}

/** Absolute paths of the areas a pattern designation may reach in the workspaces the line runs in. */
async function sensitivePaths(directories: Directories, context: GuardContext): Promise<readonly string[]> {
  const roots = new Set<string>();
  for (const directory of directories.known) {
    const root = await context.findRoot(directory);
    if (root !== null) {
      roots.add(root);
    }
  }
  const paths: string[] = [];
  for (const root of roots) {
    paths.push(root);
    for (const rule of context.policy.paths) {
      const area = join(root, rule.path);
      paths.push(area, dirname(area));
      if (rule.kind === 'directory') {
        paths.push(...GIT_SENSITIVE_NAMES.flatMap((name) => [join(area, name), join(area, 'hooks', name)]));
      }
    }
    const adrDirectory = join(root, ADR_DIRECTORY);
    paths.push(adrDirectory, dirname(adrDirectory));
    paths.push(...(await adrNames(root, context)).map((name) => join(adrDirectory, name)));
  }
  return [...new Set(paths)];
}

/** Verdict on one write target of a command line. */
async function judgeTarget(
  written: WriteTarget,
  directories: Directories,
  context: GuardContext,
): Promise<GuardVerdict> {
  const designation = await designate(written.path, written.base, directories, context);
  const { effect } = written;
  const sourceContent = async (): Promise<string | null> => {
    if (effect.kind !== 'copy') {
      return null;
    }
    const source = await designate(effect.source, written.base, directories, context);
    const [only] = source.paths;
    return source.pattern === null && source.paths.length === 1 && only !== undefined ? context.readFile(only) : null;
  };
  const reached =
    designation.pattern === null
      ? []
      : (await sensitivePaths(directories, context)).filter((path) => designation.pattern?.test(path) === true);
  for (const absolute of [...designation.paths, ...reached]) {
    const verdict = await judgeAbsoluteWrite(absolute, effect, context, sourceContent);
    if (verdict.kind === 'deny') {
      return verdict;
    }
  }
  return ALLOW;
}

async function judgeCommandLine(line: string, cwd: string, context: GuardContext): Promise<GuardVerdict> {
  const commands: readonly SimpleCommand[] = readCommands(line, { home: context.home });
  for (const command of commands) {
    const rule = context.policy.commands.find((candidate) => candidate.matches(command));
    if (rule !== undefined) {
      return deny(rule.reason);
    }
  }
  const directories = lineDirectories(commands, cwd, context.home);
  for (const command of commands) {
    for (const written of writeTargets(command)) {
      const verdict = await judgeTarget(written, directories, context);
      if (verdict.kind === 'deny') {
        return verdict;
      }
    }
  }
  return ALLOW;
}

function editOf(input: JsonObject): FileEdit | null {
  const oldString = stringField(input, 'old_string');
  const newString = stringField(input, 'new_string');
  return oldString === null || newString === null
    ? null
    : { oldString, newString, replaceAll: input['replace_all'] === true };
}

/** The content a file tool leaves, `null` when it cannot be computed or the call fails. */
function contentAfter(tool: string, input: JsonObject, before: string | null): string | null {
  switch (tool) {
    case 'Write':
      return stringField(input, 'content');
    case 'Edit': {
      const edit = editOf(input);
      return edit === null ? null : contentAfterEdit(before, edit);
    }
    case 'MultiEdit': {
      const edits = (arrayField(input, 'edits') ?? []).map((edit) => (isJsonObject(edit) ? editOf(edit) : null));
      return edits.includes(null)
        ? null
        : contentAfterMultiEdit(
            before,
            edits.filter((edit) => edit !== null),
          );
    }
    default:
      return null;
  }
}

async function judgeFileTool(
  tool: string,
  input: JsonObject,
  cwd: string,
  context: GuardContext,
): Promise<GuardVerdict> {
  const filePath = stringField(input, 'file_path') ?? stringField(input, 'notebook_path');
  if (filePath === null) {
    return deny(`Appel ${tool} sans chemin de fichier lisible : refusé par prudence.`);
  }
  const absolute = resolve(cwd, filePath);
  for (const candidate of new Set([absolute, await context.realPath(absolute)])) {
    const root = await context.findRoot(candidate);
    const path = root === null ? null : toRepoPath(root, candidate);
    if (root === null || path === null) {
      continue;
    }
    const rule = context.policy.paths.find((protectedPath) => coversPath(protectedPath, path));
    if (rule !== undefined) {
      return deny(rule.reason);
    }
    if (isAdrFilePath(path)) {
      const before = await context.readFile(candidate);
      const verdict = judgeAdrWrite(before, contentAfter(tool, input, before));
      if (verdict.kind === 'deny') {
        return verdict;
      }
    }
  }
  return ALLOW;
}

/**
 * Verdict of the `PreToolUse` hook on one tool call. A shell command is split into simple commands, each checked
 * against the command rules, then every file it writes is judged like a file tool's write: protected paths first,
 * then the ADR rules on the content the write leaves.
 */
export async function judgeToolCall(call: unknown, context: GuardContext): Promise<GuardVerdict> {
  if (!isJsonObject(call)) {
    return deny('Entrée du hook illisible : refusée par prudence.');
  }
  const tool = stringField(call, 'tool_name');
  const input = objectField(call, 'tool_input');
  const cwd = stringField(call, 'cwd') ?? process.cwd();
  if (tool === null || input === null) {
    return deny('Entrée du hook sans outil ou sans paramètres : refusée par prudence.');
  }
  const { policy } = context;
  if (policy.shellTools.includes(tool)) {
    const command = stringField(input, 'command');
    return command === null
      ? deny(`Appel ${tool} sans commande lisible : refusé par prudence.`)
      : judgeCommandLine(command, cwd, context);
  }
  if (policy.fileTools.includes(tool)) {
    return judgeFileTool(tool, input, cwd, context);
  }
  if (policy.codeTools.includes(tool)) {
    const code = JSON.stringify(input).toLowerCase();
    const token = policy.sensitiveTokens.find((sensitive) => code.includes(sensitive));
    return token === undefined
      ? ALLOW
      : deny(`Code ${tool} qui mentionne « ${token} » : la garde ne sait pas le juger, refusé par prudence.`);
  }
  return ALLOW;
}
