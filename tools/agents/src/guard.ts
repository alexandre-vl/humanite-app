import { isAbsolute, resolve } from 'node:path';
import type { GuardVerdict } from '@huma/adr/guard';
import { ALLOW, applyEdit, isAdrFilePath, judgeAdrWrite } from '@huma/adr/guard';
import type { JsonObject } from '@huma/kit/json';
import { arrayField, isJsonObject, objectField, stringField } from '@huma/kit/json';
import { toRepoPath } from '@huma/kit/paths';
import type { AgentPolicy } from './policy.ts';
import { coversPath } from './policy.ts';
import { simpleCommands } from './shell.ts';

export type GuardContext = Readonly<{
  policy: AgentPolicy;
  /** Root of the workspace that holds `absolutePath`, `null` outside any workspace. */
  findRoot: (absolutePath: string) => Promise<string | null>;
  /** File content, `null` when the file does not exist. */
  readFile: (absolutePath: string) => Promise<string | null>;
}>;

const deny = (reason: string): GuardVerdict => ({ kind: 'deny', reason });

function judgeCommand(command: string, policy: AgentPolicy): GuardVerdict {
  for (const simple of simpleCommands(command)) {
    const rule = policy.commands.find((candidate) => candidate.matches(simple));
    if (rule !== undefined) {
      return deny(rule.reason);
    }
  }
  return ALLOW;
}

/** The content a file tool would leave, `null` when the call does not describe one the guard can compute. */
async function contentAfter(
  tool: string,
  input: JsonObject,
  before: () => Promise<string | null>,
): Promise<string | null> {
  switch (tool) {
    case 'Write':
      return stringField(input, 'content');
    case 'Edit': {
      const oldString = stringField(input, 'old_string');
      const newString = stringField(input, 'new_string');
      const current = await before();
      if (oldString === null || newString === null) {
        return null;
      }
      return current === null ? newString : applyEdit(current, oldString, newString, input['replace_all'] === true);
    }
    case 'MultiEdit': {
      let current = (await before()) ?? '';
      for (const edit of arrayField(input, 'edits') ?? []) {
        const oldString = isJsonObject(edit) ? stringField(edit, 'old_string') : null;
        const newString = isJsonObject(edit) ? stringField(edit, 'new_string') : null;
        const next =
          oldString === null || newString === null
            ? null
            : applyEdit(current, oldString, newString, isJsonObject(edit) && edit['replace_all'] === true);
        if (next === null) {
          return null;
        }
        current = next;
      }
      return current;
    }
    default:
      return null;
  }
}

async function judgeFile(tool: string, input: JsonObject, cwd: string, context: GuardContext): Promise<GuardVerdict> {
  const filePath = stringField(input, 'file_path') ?? stringField(input, 'notebook_path');
  if (filePath === null) {
    return deny(`Appel ${tool} sans chemin de fichier lisible : refusé par prudence.`);
  }
  const absolute = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  const root = await context.findRoot(absolute);
  const repositoryPath = root === null ? null : toRepoPath(root, absolute);
  if (repositoryPath === null) {
    return ALLOW;
  }
  const rule = context.policy.paths.find((candidate) => coversPath(candidate, repositoryPath));
  if (rule !== undefined) {
    return deny(rule.reason);
  }
  if (!isAdrFilePath(repositoryPath)) {
    return ALLOW;
  }
  const before = await context.readFile(absolute);
  return judgeAdrWrite(before, await contentAfter(tool, input, async () => Promise.resolve(before)));
}

/**
 * Verdict of the `PreToolUse` hook on one tool call. A shell command is split into simple commands, each checked
 * against the policy; a file write is checked against the protected paths, then against the ADR rules.
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
  if (context.policy.shellTools.includes(tool)) {
    const command = stringField(input, 'command');
    return command === null ? ALLOW : judgeCommand(command, context.policy);
  }
  if (context.policy.fileTools.includes(tool)) {
    return judgeFile(tool, input, cwd, context);
  }
  return ALLOW;
}
