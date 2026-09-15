import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExitCode } from '@huma/kit/cli';
import { temporaryDirectory } from '@huma/kit/fs';
import { afterEach, expect, test, vi } from 'vitest';
import { EMULATOR } from './config.ts';
import type { Session } from './session.ts';
import { commandSession } from './session.ts';
import { withCommandLock } from './lock.ts';

/** A process id beyond `pid_max`: `process.kill(pid, 0)` answers ESRCH, so the lock reads its writer as long gone. */
const DEAD_PID = 2_147_483_646;

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A promise and the function that settles it, without `void` as a call type argument. */
function deferred(): Readonly<{ promise: Promise<void>; resolve: () => void }> {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

/** A session whose runtime directory is `runtime`, with the lines it prints kept for the test to read. */
function lockingSession(runtime: string): Readonly<{ session: Session; lines: string[] }> {
  vi.stubEnv('XDG_RUNTIME_DIR', runtime);
  const lines: string[] = [];
  return {
    session: commandSession('/work/humanite', EMULATOR, (text) => {
      lines.push(text);
    }),
    lines,
  };
}

/** Where the lock file lands for a runtime directory of `base`. */
const lockPath = (base: string): string => join(base, EMULATOR.runtimeDirectory, 'command.lock');

/** A command body that records it ran and resolves 0. */
const succeeds = (log: { ran: boolean }) => async (): Promise<ExitCode> => {
  log.ran = true;
  await Promise.resolve();
  return 0;
};

test('a command runs holding the lock, then frees it for the next', async () => {
  await using directory = await temporaryDirectory('emulator-lock');
  const { session } = lockingSession(directory.path);
  const first = { ran: false };
  expect(await withCommandLock(session, 'up', succeeds(first))).toBe(0);
  expect(first.ran).toBe(true);
  const second = { ran: false };
  expect(await withCommandLock(session, 'down', succeeds(second))).toBe(0);
  expect(second.ran).toBe(true);
});

test('a second command finds the lock held, names who holds it, and does not run', async () => {
  await using directory = await temporaryDirectory('emulator-lock');
  const { session, lines } = lockingSession(directory.path);
  const started = deferred();
  const release = deferred();
  const holding = withCommandLock(session, 'up', async () => {
    started.resolve();
    await release.promise;
    return 0;
  });
  await started.promise;
  const blocked = { ran: false };
  expect(await withCommandLock(session, 'install', succeeds(blocked))).toBe(1);
  expect(blocked.ran).toBe(false);
  const prefix = `✗ pnpm emulator:up tient déjà le verrou de l’émulateur (pid ${String(process.pid)}, depuis `;
  expect(lines[0]?.startsWith(prefix)).toBe(true);
  release.resolve();
  expect(await holding).toBe(0);
});

test('a lock left by a process that has died is stolen, and the command runs', async () => {
  await using directory = await temporaryDirectory('emulator-lock');
  await mkdir(join(directory.path, EMULATOR.runtimeDirectory), { recursive: true });
  await writeFile(
    lockPath(directory.path),
    JSON.stringify({ pid: DEAD_PID, command: 'up', startedAt: new Date().toISOString() }),
  );
  const { session } = lockingSession(directory.path);
  const stolen = { ran: false };
  expect(await withCommandLock(session, 'down', succeeds(stolen))).toBe(0);
  expect(stolen.ran).toBe(true);
});

test('a garbled lock file names no holder, so the next command takes the lock', async () => {
  await using directory = await temporaryDirectory('emulator-lock');
  await mkdir(join(directory.path, EMULATOR.runtimeDirectory), { recursive: true });
  await writeFile(lockPath(directory.path), 'ce n’est pas du JSON');
  const { session } = lockingSession(directory.path);
  const taken = { ran: false };
  expect(await withCommandLock(session, 'e2e', succeeds(taken))).toBe(0);
  expect(taken.ran).toBe(true);
});
