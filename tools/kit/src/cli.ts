import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { stopLiveProcessesOnSignals } from './process.ts';

/** File that marks the root of the workspace. */
export const WORKSPACE_MARKER = 'pnpm-workspace.yaml';

/** A wrong invocation: its message is printed as is and the command exits with 2. */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}

export const print = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

export const printError = (text: string): void => {
  process.stderr.write(`${text}\n`);
};

/** 0: success · 1: findings or a refusal. Misuse and crashes exit with 2 through `runCommand`. */
export type ExitCode = 0 | 1;

/**
 * Runs a command body and sets `process.exitCode`, so pending output is flushed before Node exits; an interrupted
 * command stops the processes it started.
 */
export async function runCommand(body: () => Promise<ExitCode>): Promise<void> {
  stopLiveProcessesOnSignals();
  try {
    process.exitCode = await body();
  } catch (error) {
    if (error instanceof UsageError) {
      printError(error.message);
    } else if (Error.isError(error)) {
      printError(error.stack ?? error.message);
    } else {
      printError(`Erreur non typée : ${typeof error}`);
    }
    process.exitCode = 2;
  }
}

/** The nearest directory from `start` upwards that holds `WORKSPACE_MARKER`. */
export async function findWorkspaceRoot(start: string = process.cwd()): Promise<string> {
  let directory = start;
  for (;;) {
    try {
      await access(join(directory, WORKSPACE_MARKER));
      return directory;
    } catch {
      const parent = dirname(directory);
      if (parent === directory) {
        throw new UsageError(`Aucun ${WORKSPACE_MARKER} au-dessus de ${start}`);
      }
      directory = parent;
    }
  }
}
