/** Claude Code `Stop` hook: runs `pnpm verify` when the working tree changed since the last green run. */
import { text } from 'node:stream/consumers';
import { findWorkspaceRoot, printError } from '@huma/kit/cli';
import { respondToStop } from '../hooks/stop.ts';

try {
  const rawInput = await text(process.stdin);
  process.stdout.write(await respondToStop(rawInput, await findWorkspaceRoot()));
} catch (error) {
  printError(`Hook Stop en échec : ${Error.isError(error) ? error.message : typeof error}`);
}
