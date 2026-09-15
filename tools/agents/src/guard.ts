import { basename, dirname, join, resolve } from 'node:path';
import type { AdrWriteProblem } from '@huma/adr/guard';
import { adrWriteProblem, isAdrFilePath, looksDecided } from '@huma/adr/guard';
import { ADR_DIRECTORY } from '@huma/adr/layout';
import { DECIDED_STATUSES, INITIAL_STATUS } from '@huma/adr/statuses';
import type { Refusal } from '@huma/kit/checks';
import type { JsonObject } from '@huma/kit/json';
import { arrayField, isJsonObject, objectField, stringField } from '@huma/kit/json';
import { toRepoPath } from '@huma/kit/paths';
import type { AgentCode } from './checks.ts';
import { agentRefusal } from './checks.ts';
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

/** Every reason to refuse a call, as far as the guard has looked: none lets it through. */
type Refusals = readonly Refusal<AgentCode>[];

const NONE: Refusals = [];

const ADR_REFUSALS: Readonly<Record<AdrWriteProblem, Refusal<AgentCode>>> = {
  decided: agentRefusal('agent/adr-decided', {}),
  'not-proposed': agentRefusal('agent/adr-not-proposed', { status: INITIAL_STATUS, decided: DECIDED_STATUSES }),
  'unknown-result': agentRefusal('agent/adr-unknown-result', {}),
};

const ADR_SHELL_UNKNOWN = agentRefusal('agent/adr-shell-unknown', {});

const ADR_TREE = agentRefusal('agent/adr-tree', {});

const ADR_ALIAS = agentRefusal('agent/adr-alias', {});

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

/** What refuses a write that turns an ADR file `before` into `after`, both known but `after` possibly `null`. */
function adrRefusals(before: string | null, after: string | null): Refusals {
  const problem = adrWriteProblem(before, after);
  return problem === null ? NONE : [ADR_REFUSALS[problem]];
}

/** What refuses a command writing `after` to an ADR file, where `null` means content the command does not tell. */
function shellAdrRefusals(before: string | null, after: string | null): Refusals {
  if (after !== null) {
    return adrRefusals(before, after);
  }
  return [before !== null && looksDecided(before) ? ADR_REFUSALS.decided : ADR_SHELL_UNKNOWN];
}

async function adrNames(root: string, context: GuardContext): Promise<readonly string[]> {
  const names = (await context.listDirectory(join(root, ADR_DIRECTORY))) ?? [];
  return [...names.filter((name) => isAdrFilePath(`${ADR_DIRECTORY}/${name}`)), '0000-adr.md'];
}

/** What refuses a write to an ADR file, by the effect it has there. */
async function adrFileRefusals(
  write: Write,
  context: GuardContext,
  sourceContent: () => Promise<string | null>,
): Promise<Refusals> {
  const { path, effect } = write;
  if (!isAdrFilePath(path)) {
    return NONE;
  }
  const before = await context.readFile(write.absolute);
  switch (effect.kind) {
    case 'metadata':
      return NONE;
    case 'alias':
      return [ADR_ALIAS];
    case 'remove':
      return before !== null && looksDecided(before) ? [ADR_REFUSALS.decided] : NONE;
    case 'tree':
      return shellAdrRefusals(before, null);
    case 'content':
      return shellAdrRefusals(
        before,
        effect.content === null ? null : `${effect.append ? (before ?? '') : ''}${effect.content}`,
      );
    case 'copy':
      return shellAdrRefusals(before, await sourceContent());
  }
}

/** What refuses one write to a repository path (`''` for the root), whatever tool or command makes it. */
async function judgeWrite(
  write: Write,
  context: GuardContext,
  sourceContent: () => Promise<string | null>,
): Promise<Refusals> {
  const { path, effect } = write;
  const wide = effect.kind === 'remove' || effect.kind === 'tree';
  const areas = context.policy.paths.filter(
    (rule) =>
      (coversPath(rule, path) || (wide && holds(path, rule.path) && reachesNames(effect, sensitiveNames(rule)))) &&
      refuses(rule, effect),
  );
  const tree = wide && holds(path, ADR_DIRECTORY) && reachesNames(effect, await adrNames(write.root, context));
  return [
    ...areas.map((rule) => rule.refusal),
    ...(tree ? [ADR_TREE] : NONE),
    ...(await adrFileRefusals(write, context, sourceContent)),
  ];
}

/** What refuses a write to an absolute path, judged at the path and, through symbolic links, where it really lands. */
async function judgeAbsoluteWrite(
  absolute: string,
  effect: WriteEffect,
  context: GuardContext,
  sourceContent: () => Promise<string | null>,
): Promise<Refusals> {
  const refusals: Refusal<AgentCode>[] = [];
  for (const candidate of new Set([absolute, await context.realPath(absolute)])) {
    const root = await context.findRoot(candidate);
    if (root === null) {
      continue;
    }
    const path = candidate === root ? '' : toRepoPath(root, candidate);
    if (path === null) {
      continue;
    }
    refusals.push(...(await judgeWrite({ root, path, absolute: candidate, effect }, context, sourceContent)));
  }
  return refusals;
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

/** What refuses one write target of a command line. */
async function judgeTarget(written: WriteTarget, directories: Directories, context: GuardContext): Promise<Refusals> {
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
  const refusals: Refusal<AgentCode>[] = [];
  for (const absolute of [...designation.paths, ...reached]) {
    refusals.push(...(await judgeAbsoluteWrite(absolute, effect, context, sourceContent)));
  }
  return refusals;
}

/** What refuses a command line: the rules each of its simple commands breaks, then each file one of them writes. */
async function judgeCommandLine(line: string, cwd: string, context: GuardContext): Promise<Refusals> {
  const commands: readonly SimpleCommand[] = readCommands(line, { home: context.home });
  const refusals = commands.flatMap((command) =>
    context.policy.commands.filter((rule) => rule.matches(command)).map((rule) => rule.refusal),
  );
  const directories = lineDirectories(commands, cwd, context.home);
  for (const command of commands) {
    for (const written of writeTargets(command)) {
      refusals.push(...(await judgeTarget(written, directories, context)));
    }
  }
  return refusals;
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

async function judgeFileTool(tool: string, input: JsonObject, cwd: string, context: GuardContext): Promise<Refusals> {
  const filePath = stringField(input, 'file_path') ?? stringField(input, 'notebook_path');
  if (filePath === null) {
    return [agentRefusal('agent/call-without-path', { tool })];
  }
  const absolute = resolve(cwd, filePath);
  const refusals: Refusal<AgentCode>[] = [];
  for (const candidate of new Set([absolute, await context.realPath(absolute)])) {
    const root = await context.findRoot(candidate);
    const path = root === null ? null : toRepoPath(root, candidate);
    if (path === null) {
      continue;
    }
    refusals.push(...context.policy.paths.filter((rule) => coversPath(rule, path)).map((rule) => rule.refusal));
    if (isAdrFilePath(path)) {
      const before = await context.readFile(candidate);
      refusals.push(...adrRefusals(before, contentAfter(tool, input, before)));
    }
  }
  return refusals;
}

async function judgeCall(call: unknown, context: GuardContext): Promise<Refusals> {
  if (!isJsonObject(call)) {
    return [agentRefusal('agent/unreadable-call', {})];
  }
  const tool = stringField(call, 'tool_name');
  const input = objectField(call, 'tool_input');
  const cwd = stringField(call, 'cwd') ?? process.cwd();
  if (tool === null || input === null) {
    return [agentRefusal('agent/call-without-tool', {})];
  }
  const { policy } = context;
  if (policy.shellTools.includes(tool)) {
    const command = stringField(input, 'command');
    return command === null
      ? [agentRefusal('agent/call-without-command', { tool })]
      : judgeCommandLine(command, cwd, context);
  }
  if (policy.fileTools.includes(tool)) {
    return judgeFileTool(tool, input, cwd, context);
  }
  if (policy.codeTools.includes(tool)) {
    const code = JSON.stringify(input).toLowerCase();
    const token = policy.sensitiveTokens.find((sensitive) => code.includes(sensitive));
    return token === undefined ? NONE : [agentRefusal('agent/code-unjudgeable', { tool, token })];
  }
  return NONE;
}

/**
 * What the `PreToolUse` hook answers to one tool call: every rule it breaks, each code once in the order the call
 * reached it, and nothing when it breaks none. A shell command is split into simple commands, each checked against
 * the command rules, then every file it writes is judged like a file tool's write: protected paths, then the ADR rules
 * on the content the write leaves. Nothing stops at the first refusal, so that a fixture sees each rule it breaks.
 */
export async function judgeToolCall(call: unknown, context: GuardContext): Promise<Refusals> {
  const refusals = await judgeCall(call, context);
  return refusals.filter((refusal, index) => refusals.findIndex(({ code }) => code === refusal.code) === index);
}
