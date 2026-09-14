/**
 * Claude Code `PreToolUse` hook. This entry imports nothing at load time: the guard itself is loaded inside a
 * `try`, so a guard that fails to load or crashes still refuses the calls that touch a protected area.
 */
import { text } from 'node:stream/consumers';
import { denyOutput, guardFailureReason, touchesProtectedArea } from '../hooks/fallback.ts';

let rawInput = '';
try {
  rawInput = await text(process.stdin);
  const { respondToToolCall } = await import('../hooks/guard.ts');
  process.stdout.write(await respondToToolCall(rawInput));
} catch (error) {
  if (touchesProtectedArea(rawInput)) {
    process.stdout.write(denyOutput(guardFailureReason(Error.isError(error) ? error.message : typeof error)));
  }
}
