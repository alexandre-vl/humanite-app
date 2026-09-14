import { readFile } from 'node:fs/promises';
import { judgeToolCall } from '@huma/agents/guard';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { parseJson } from '@huma/kit/json';
import { POLICY } from '../policy.ts';
import { denyOutput } from './fallback.ts';

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

const rootOf = async (path: string): Promise<string | null> => findWorkspaceRoot(path).catch(() => null);

/** Output of the `PreToolUse` hook for a raw input: a deny decision, or nothing to let the call through. */
export async function respondToToolCall(rawInput: string): Promise<string> {
  const verdict = await judgeToolCall(parseJson(rawInput), {
    policy: POLICY,
    findRoot: rootOf,
    readFile: readOptional,
  });
  return verdict.kind === 'deny' ? denyOutput(verdict.reason) : '';
}
