import type { AgentPolicy } from '@huma/agents/policy';
import { agentPolicy } from '@huma/agents/policy';
import type { HookCommands } from '@huma/agents/settings';
import { EMULATOR, emulatorMarkers } from '@huma/emulator/config';
import { COMMAND_NAMES, COMMANDS, nodeEntry, PINNED_NODE } from './commands.ts';
import { STAMP_PATH } from './verify.ts';

/**
 * The agent policy of this workspace: the fixed rules, every command reserved to the human decision maker, and the
 * container of the Android emulator.
 */
export const POLICY: AgentPolicy = agentPolicy(
  // The table gives a human command a TypeScript entry: the guard recognises the file, not only the script name.
  COMMAND_NAMES.flatMap((script) => {
    const spec = COMMANDS[script];
    return spec.audience === 'human' ? [{ script, entry: spec.program.entry }] : [];
  }),
  { container: EMULATOR.container, markers: emulatorMarkers(EMULATOR) },
  STAMP_PATH,
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
