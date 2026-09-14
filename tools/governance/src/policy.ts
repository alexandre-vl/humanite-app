import type { AgentPolicy } from '@huma/agents/policy';
import { agentPolicy } from '@huma/agents/policy';
import type { HookCommands } from '@huma/agents/settings';
import { COMMAND_NAMES, COMMANDS, entryFile } from './commands.ts';

/** The agent policy of this workspace: the fixed rules, plus every command reserved to the human decision maker. */
export const POLICY: AgentPolicy = agentPolicy(
  COMMAND_NAMES.flatMap((script) => {
    const spec = COMMANDS[script];
    const entry = entryFile(spec);
    return spec.audience === 'human' && entry !== null ? [{ script, entry }] : [];
  }),
);

/** Node pinned by `devEngines`, linked by pnpm into the workspace. */
export const PINNED_NODE = 'node_modules/.bin/node';

const inProject = (path: string): string => `"\${CLAUDE_PROJECT_DIR}/${path}"`;

const hookLine = (name: 'agent:guard' | 'agent:stop'): string => {
  const entry = entryFile(COMMANDS[name]);
  if (entry === null) {
    throw new Error(`${name} n’est pas une commande node`);
  }
  return `${inProject(PINNED_NODE)} ${inProject(entry)}`;
};

/** Seconds the stop hook may take: a whole `pnpm verify` on a busy machine. */
export const STOP_TIMEOUT_SECONDS = 900;

export const HOOK_COMMANDS: HookCommands = {
  guard: hookLine('agent:guard'),
  stop: hookLine('agent:stop'),
  stopTimeoutSeconds: STOP_TIMEOUT_SECONDS,
};
