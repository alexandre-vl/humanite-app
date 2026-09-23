import { mkdir, open, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExitCode } from '@huma/kit/cli';
import { errnoCode } from '@huma/kit/errors';
import { readTextIfExists } from '@huma/kit/fs';
import { parseJson, stringField } from '@huma/kit/json';
import { isRecord } from '@huma/unknown';
import type { EmulatorConfig } from './config.ts';
import type { Session } from './session.ts';
import { runtimeDirectory } from './session.ts';

/**
 * One command at a time may change or drive the emulator: `up`, `down`, `install` and `e2e` share the host sample, the
 * container and the device, and two at once would race on all three. This lock, a file each holds while it runs, keeps
 * them apart. It lives in the runtime directory of the user, so a single lock spans every worktree: there is one
 * container, one host and one guard for all of them. `status` only reads and `metro` only serves, so neither takes it.
 */

/** Who holds the lock: the process, the command it runs, and when it took it — printed to whoever finds it busy. */
type LockHolder = Readonly<{ pid: number; command: string; startedAt: string }>;

type LockOutcome = Readonly<{ ok: true; lock: AsyncDisposable }> | Readonly<{ ok: false; holder: LockHolder }>;

const lockFile = (config: EmulatorConfig): string => join(runtimeDirectory(config), 'command.lock');

/** The holder a lock file names, or `null` when it is missing, garbled or half-written: such a file frees the lock. */
function readHolder(text: string | null): LockHolder | null {
  const value = text === null ? undefined : parseJson(text);
  if (!isRecord(value)) {
    return null;
  }
  const command = stringField(value, 'command');
  const startedAt = stringField(value, 'startedAt');
  const pid = value['pid'];
  return command !== null && startedAt !== null && typeof pid === 'number' && Number.isInteger(pid) && pid > 0
    ? { pid, command, startedAt }
    : null;
}

/** Whether the process that wrote a lock still runs: signal 0 reaches it, or it exists but is not ours to signal. */
function holderRuns(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errnoCode(error) === 'EPERM';
  }
}

/**
 * Takes the lock, or reports who holds it. The file is created only if absent (`wx`), so two commands starting at once
 * cannot both take it and the loser reads the winner. A file left by a process that no longer runs is stolen: the
 * runtime directory is emptied at each boot, so a stale file is always this boot's and its writer has since died.
 */
async function acquireCommandLock(config: EmulatorConfig, command: string): Promise<LockOutcome> {
  const file = lockFile(config);
  const holder: LockHolder = { pid: process.pid, command, startedAt: new Date().toISOString() };
  await mkdir(runtimeDirectory(config), { recursive: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const handle = await open(file, 'wx');
      try {
        await handle.writeFile(`${JSON.stringify(holder, null, 2)}\n`);
      } finally {
        await handle.close();
      }
      return {
        ok: true,
        lock: {
          [Symbol.asyncDispose]: async () => {
            await rm(file, { force: true });
          },
        },
      };
    } catch (error) {
      if (errnoCode(error) !== 'EEXIST') {
        throw error;
      }
      const current = readHolder(await readTextIfExists(file));
      if (current !== null && holderRuns(current.pid)) {
        return { ok: false, holder: current };
      }
      await rm(file, { force: true });
    }
  }
  throw new Error('verrou de l’émulateur : un processus le recrée à chaque tentative de le prendre');
}

/** The line a command prints when another holds the lock, in the shape of the emulator's other refusals. */
const busyLine = (holder: LockHolder): string =>
  `✗ pnpm emulator:${holder.command} tient déjà le verrou de l’émulateur (pid ${String(holder.pid)}, depuis ${holder.startedAt})`;

/**
 * Runs `body` while holding the command lock, releasing it whatever `body` does. When another command holds it, prints
 * who and resolves 1 without running `body`: the caller learns to wait for it rather than race it.
 */
export async function withCommandLock(
  session: Session,
  command: string,
  body: (session: Session) => Promise<ExitCode>,
): Promise<ExitCode> {
  const outcome = await acquireCommandLock(session.config, command);
  if (!outcome.ok) {
    session.print(busyLine(outcome.holder));
    return 1;
  }
  try {
    return await body(session);
  } finally {
    await outcome.lock[Symbol.asyncDispose]();
  }
}
