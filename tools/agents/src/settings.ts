import type { AgentPolicy } from './policy.ts';
import { pathPermission } from './policy.ts';

export type HookCommands = Readonly<{
  /** Command line of the `PreToolUse` guard. */
  guard: string;
  /** Command line of the `Stop` hook that runs the repository checks. */
  stop: string;
  /** Seconds the `Stop` hook may run: the whole check suite. */
  stopTimeoutSeconds: number;
}>;

export const SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json';

/** `.claude/settings.json` of the repository: the hooks that enforce the policy and the permission rules that echo it. */
export function renderClaudeSettings(policy: AgentPolicy, hooks: HookCommands): string {
  const settings = {
    $schema: SETTINGS_SCHEMA,
    hooks: {
      PreToolUse: [
        {
          matcher: [...policy.shellTools, ...policy.fileTools].join('|'),
          hooks: [{ type: 'command', command: hooks.guard }],
        },
      ],
      Stop: [{ hooks: [{ type: 'command', command: hooks.stop, timeout: hooks.stopTimeoutSeconds }] }],
    },
    permissions: {
      deny: [...policy.commands.flatMap((rule) => rule.permissions), ...policy.paths.map(pathPermission)],
    },
  };
  return `${JSON.stringify(settings, null, 2)}\n`;
}
