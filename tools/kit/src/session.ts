import type { Environment } from './process.ts';

/**
 * Variables that AI agent runners set in the environment of the commands they launch: Claude Code sets `CLAUDECODE`
 * and `CLAUDE_CODE_CHILD_SESSION` (https://code.claude.com/docs/en/env-vars), other runners `AI_AGENT`. A child process
 * can unset them, so they identify an honest agent session, not a determined one.
 */
export const AGENT_SESSION_VARIABLES = ['CLAUDECODE', 'CLAUDE_CODE_CHILD_SESSION', 'AI_AGENT'] as const;

/** The agent variables set in `env`, empty for a human terminal. */
export const agentSessionMarkers = (env: Environment): readonly string[] =>
  AGENT_SESSION_VARIABLES.filter((name) => env[name] !== undefined && env[name] !== '');
