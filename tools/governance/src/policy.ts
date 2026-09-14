import type { AgentPolicy } from '@huma/agents/policy';
import { agentPolicy } from '@huma/agents/policy';
import type { HookCommands } from '@huma/agents/settings';
import { COMMAND_NAMES, COMMANDS, entryFile, nodeEntry, PINNED_NODE } from './commands.ts';

/** The agent policy of this workspace: the fixed rules, plus every command reserved to the human decision maker. */
export const POLICY: AgentPolicy = agentPolicy(
  COMMAND_NAMES.flatMap((script) => {
    const spec = COMMANDS[script];
    const entry = entryFile(spec);
    return spec.audience === 'human' && entry !== null ? [{ script, entry }] : [];
  }),
);

const inProject = (path: string): string => `"\${CLAUDE_PROJECT_DIR}/${path}"`;

const hookLine = (name: 'agent:guard' | 'agent:stop'): string =>
  `${inProject(PINNED_NODE)} ${inProject(nodeEntry(name))}`;

/** Seconds the stop hook may take: a whole `pnpm verify` on a busy machine. */
export const STOP_TIMEOUT_SECONDS = 900;

export const HOOK_COMMANDS: HookCommands = {
  guard: hookLine('agent:guard'),
  stop: hookLine('agent:stop'),
  stopTimeoutSeconds: STOP_TIMEOUT_SECONDS,
};
