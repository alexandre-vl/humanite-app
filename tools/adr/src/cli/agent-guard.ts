import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { text } from 'node:stream/consumers';
import type { GuardDecision } from '../guard.ts';
import { applyEdit, guardAdrWrite, guardCommand, isAdrFile } from '../guard.ts';
import { findRoot } from './root.ts';

/**
 * Claude Code `PreToolUse` hook, run before every Edit, Write and Bash call. It answers on stdout with a deny
 * decision, or prints nothing to let the normal permission flow go on. A failure while judging an ADR write denies
 * it; any other failure lets the call through. The input is narrowed by hand: importing a schema library would
 * double the latency added to every tool call.
 */

type Fields = Readonly<Record<string, unknown>>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringField = (fields: Fields, key: string): string | null => {
  const value = fields[key];
  return typeof value === 'string' ? value : null;
};

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (Error.isError(error) && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function judgeFile(
  filePath: string,
  cwd: string,
  after: (before: string | null) => string | null,
): Promise<GuardDecision> {
  const absolute = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  let root: string;
  try {
    root = await findRoot(resolve(absolute, '..'));
  } catch {
    return { kind: 'allow' };
  }
  if (!isAdrFile(relative(root, absolute).split(sep).join('/'))) {
    return { kind: 'allow' };
  }
  try {
    const before = await readOptional(absolute);
    const next = after(before);
    return next === null ? { kind: 'allow' } : guardAdrWrite(before, next);
  } catch (error) {
    return { kind: 'deny', reason: `Garde ADR en échec, écriture refusée par prudence : ${String(error)}` };
  }
}

async function judge(raw: string): Promise<GuardDecision> {
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return { kind: 'allow' };
  }
  if (!isFields(input) || !isFields(input['tool_input'])) {
    return { kind: 'allow' };
  }
  const toolInput = input['tool_input'];
  const cwd = stringField(input, 'cwd') ?? process.cwd();
  const filePath = stringField(toolInput, 'file_path');
  switch (stringField(input, 'tool_name')) {
    case 'Write': {
      const content = stringField(toolInput, 'content');
      return filePath === null || content === null ? { kind: 'allow' } : judgeFile(filePath, cwd, () => content);
    }
    case 'Edit': {
      const oldString = stringField(toolInput, 'old_string');
      const newString = stringField(toolInput, 'new_string');
      if (filePath === null || oldString === null || newString === null) {
        return { kind: 'allow' };
      }
      const replaceAll = toolInput['replace_all'] === true;
      return judgeFile(filePath, cwd, (before) =>
        before === null ? newString : applyEdit(before, oldString, newString, replaceAll),
      );
    }
    case 'Bash': {
      const command = stringField(toolInput, 'command');
      return command === null ? { kind: 'allow' } : guardCommand(command);
    }
    case null:
    default:
      return { kind: 'allow' };
  }
}

const decision = await judge(await text(process.stdin));
if (decision.kind === 'deny') {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: decision.reason,
      },
    })}\n`,
  );
}
