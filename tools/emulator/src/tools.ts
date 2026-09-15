import { runText } from '@huma/kit/process';
import type { Session } from './session.ts';

/** Where mise installed the pinned version of `tool`; mise refuses a version it has not installed. */
export const toolDirectory = async (session: Session, tool: 'java' | 'maestro'): Promise<string> =>
  (
    await runText('mise', ['where', `${tool}@${session.config.tools[tool]}`], {
      cwd: session.root,
      signal: session.signal,
    })
  ).trim();
