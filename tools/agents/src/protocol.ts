import { objectField, parseJson, stringField } from '@huma/kit/json';
import type { UnknownRecord } from '@huma/unknown';
import { isRecord } from '@huma/unknown';

/**
 * The Claude Code hook protocol (https://code.claude.com/docs/en/hooks): what a hook reads on stdin and the outputs
 * this workspace answers with. It imports nothing heavier than JSON narrowing, so a failing hook can still answer.
 */

export type HookInput = Readonly<{
  toolName: string | null;
  toolInput: UnknownRecord | null;
  /** Directory of the session or subagent the event comes from; worktree sessions report their worktree here. */
  cwd: string | null;
  /** The `Stop` hook already kept the agent working once in this turn. */
  stopHookActive: boolean;
}>;

/** The fields of a raw hook input, `null` when it is not a JSON object. */
export function readHookInput(raw: string): HookInput | null {
  const value = parseJson(raw);
  if (!isRecord(value)) {
    return null;
  }
  return {
    toolName: stringField(value, 'tool_name'),
    toolInput: objectField(value, 'tool_input'),
    cwd: stringField(value, 'cwd'),
    stopHookActive: value['stop_hook_active'] === true,
  };
}

/** `PreToolUse` output that refuses the tool call; the reason is shown to the agent. */
export const denyOutput = (reason: string): string =>
  `${JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  })}\n`;

/** `Stop` output that keeps the agent working; the reason is shown to the agent. */
export const blockOutput = (reason: string): string => `${JSON.stringify({ decision: 'block', reason })}\n`;
