/**
 * Claude Code `Stop` hook: runs `pnpm verify` when the working tree changed since the last green run. The checks are
 * loaded inside a `try`, so a hook that fails to load or crashes still keeps the agent working, with the reason.
 */
import { text } from 'node:stream/consumers';
import { stopLiveProcessesOnSignals } from '@huma/kit/process';
import { stopFailureOutput } from '../hooks/fallback.ts';

stopLiveProcessesOnSignals();
let rawInput = '';
try {
  rawInput = await text(process.stdin);
  const { respondToStop } = await import('../hooks/stop.ts');
  process.stdout.write(await respondToStop(rawInput));
} catch (error) {
  process.stdout.write(stopFailureOutput(rawInput, error));
}
