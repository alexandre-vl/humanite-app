import { isJsonObject } from '@huma/kit/json';

/** What the `Stop` hook does: let the agent stop, or run the checks first. */
export type StopAction = 'allow' | 'verify';

export type StopInput = Readonly<{
  /** Claude Code already continued once because of this hook: stopping is allowed, to avoid a loop. */
  stopHookActive: boolean;
  /** Tree id of the working tree now. */
  currentTree: string;
  /** Tree id recorded by the last successful `pnpm verify`, `null` when none. */
  verifiedTree: string | null;
}>;

export const decideStop = (input: StopInput): StopAction =>
  input.stopHookActive || input.currentTree === input.verifiedTree ? 'allow' : 'verify';

export const isStopHookActive = (hookInput: unknown): boolean =>
  isJsonObject(hookInput) && hookInput['stop_hook_active'] === true;

/** Output that keeps the agent working, with the failing check as the reason. */
export const blockStop = (reason: string): string => `${JSON.stringify({ decision: 'block', reason })}\n`;
