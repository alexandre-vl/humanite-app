import { runText } from '@huma/kit/process';
import type { Session } from './session.ts';

/**
 * Time a command that only asks a question of the host may take: systemd, mise. Generous for a loaded shared host, but
 * finite, since several of them are asked in a loop while a step waits.
 */
export const QUERY_TIMEOUT_MS = 15_000;

/** Where mise installed the pinned version of `tool`; mise refuses a version it has not installed. */
export const toolDirectory = async (session: Session, tool: 'java' | 'maestro'): Promise<string> =>
  (
    await runText('mise', ['where', `${tool}@${session.config.tools[tool]}`], {
      cwd: session.root,
      signal: session.signal,
      timeoutMs: QUERY_TIMEOUT_MS,
    })
  ).trim();
