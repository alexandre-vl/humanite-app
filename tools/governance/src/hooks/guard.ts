import { judgeToolCall } from '@huma/agents/guard';
import { denyOutput } from '@huma/agents/protocol';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { readTextIfExists } from '@huma/kit/fs';
import { parseJson } from '@huma/kit/json';
import { POLICY } from '../policy.ts';

const rootOf = async (path: string): Promise<string | null> => findWorkspaceRoot(path).catch(() => null);

/** Output of the `PreToolUse` hook for a raw input: a deny decision, or nothing to let the call through. */
export async function respondToToolCall(rawInput: string): Promise<string> {
  const verdict = await judgeToolCall(parseJson(rawInput), {
    policy: POLICY,
    findRoot: rootOf,
    readFile: readTextIfExists,
  });
  return verdict.kind === 'deny' ? denyOutput(verdict.reason) : '';
}
