import { homedir } from 'node:os';
import type { GuardContext } from '@huma/agents/guard';
import { judgeToolCall } from '@huma/agents/guard';
import { denyOutput } from '@huma/agents/protocol';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { directoryNames, readTextIfExists, resolveExistingPath } from '@huma/kit/fs';
import { parseJson } from '@huma/kit/json';
import { POLICY } from '../policy.ts';

/** The guard reading the real file system of the session. */
const CONTEXT: GuardContext = {
  policy: POLICY,
  home: homedir(),
  findRoot: async (path) => findWorkspaceRoot(path).catch(() => null),
  readFile: async (path) => readTextIfExists(path).catch(() => null),
  listDirectory: directoryNames,
  realPath: resolveExistingPath,
};

/**
 * Output of the `PreToolUse` hook for a raw input: a deny decision naming each rule the call breaks, one per line
 * under its code, or nothing to let the call through.
 */
export async function respondToToolCall(rawInput: string): Promise<string> {
  const refusals = await judgeToolCall(parseJson(rawInput), CONTEXT);
  return refusals.length === 0 ? '' : denyOutput(refusals.map(({ code, reason }) => `${code}: ${reason}`).join('\n'));
}
