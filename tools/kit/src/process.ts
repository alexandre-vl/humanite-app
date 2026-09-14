import { spawn } from 'node:child_process';
import { decodeUtf8 } from './text.ts';

export type Environment = Readonly<Record<string, string | undefined>>;

/**
 * How a child process ended. A process stopped by its time budget or by an abort never counts as exited, whatever
 * code it returned while being stopped.
 */
export type Exit =
  | Readonly<{ kind: 'exited'; code: number }>
  | Readonly<{ kind: 'killed'; signal: NodeJS.Signals }>
  | Readonly<{ kind: 'timed-out'; afterMs: number }>
  | Readonly<{ kind: 'aborted' }>
  | Readonly<{ kind: 'unstartable'; reason: string }>;

export type ProcessOptions = Readonly<{
  cwd: string;
  /** Complete environment of the child; the current process environment when absent. */
  env?: Environment;
  input?: string | Uint8Array;
  /** Stops the child and every process it started once this budget is spent. */
  timeoutMs?: number;
  /** Stops the child and every process it started when aborted. */
  signal?: AbortSignal;
  /** Delay between SIGTERM and SIGKILL when the child is stopped. */
  killGraceMs?: number;
}>;

export type Captured = Readonly<{ exit: Exit; stdout: Buffer; stderr: Buffer }>;

export const KILL_GRACE_MS = 2_000;

/** How long the outputs of an exited child stay open for a process it left behind before they are closed. */
const DRAIN_MS = 1_000;

const TAIL_LENGTH = 2_000;

/** Process groups of stoppable children still running: they are killed if this process exits first. */
const liveGroups = new Set<number>();

const signalGroup = (group: number, signal: NodeJS.Signals): void => {
  try {
    process.kill(-group, signal);
  } catch {
    // The group is already gone.
  }
};

/** Kills every stoppable child group still running; this process exits right after. */
export function stopLiveProcesses(): void {
  for (const group of liveGroups) {
    signalGroup(group, 'SIGKILL');
  }
  liveGroups.clear();
}

process.once('exit', stopLiveProcesses);

/** Makes SIGINT and SIGTERM stop the stoppable children first, then end this process as the signal would have. */
export function stopLiveProcessesOnSignals(): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      stopLiveProcesses();
      process.kill(process.pid, signal);
    });
  }
}

export const describeExit = (exit: Exit): string => {
  switch (exit.kind) {
    case 'exited':
      return `code de sortie ${String(exit.code)}`;
    case 'killed':
      return `tué par le signal ${exit.signal}`;
    case 'timed-out':
      return `délai de ${String(exit.afterMs)} ms dépassé`;
    case 'aborted':
      return 'interrompu';
    case 'unstartable':
      return `lancement impossible (${exit.reason})`;
  }
};

/**
 * Runs `command` without a shell, feeds it `input` and collects both outputs; never rejects. A child with a time budget
 * or an abort signal leads its own process group, so stopping it also stops what it started: SIGTERM, then SIGKILL.
 */
export async function capture(command: string, args: readonly string[], options: ProcessOptions): Promise<Captured> {
  const empty = Buffer.alloc(0);
  if (options.signal?.aborted === true) {
    return { exit: { kind: 'aborted' }, stdout: empty, stderr: empty };
  }
  const stoppable = options.timeoutMs !== undefined || options.signal !== undefined;
  const graceMs = options.killGraceMs ?? KILL_GRACE_MS;
  return new Promise<Captured>((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: stoppable,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timers: NodeJS.Timeout[] = [];
    const group = stoppable ? child.pid : undefined;
    let stopped: Exit | null = null;
    let settled = false;

    const settle = (exit: Exit): void => {
      if (settled) {
        return;
      }
      settled = true;
      timers.forEach(clearTimeout);
      options.signal?.removeEventListener('abort', abort);
      if (group !== undefined) {
        liveGroups.delete(group);
        if (stopped !== null) {
          signalGroup(group, 'SIGKILL');
        }
      }
      resolve({ exit, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    };
    const stop = (reason: Exit): void => {
      if (stopped !== null || group === undefined) {
        return;
      }
      stopped = reason;
      signalGroup(group, 'SIGTERM');
      timers.push(
        setTimeout(() => {
          signalGroup(group, 'SIGKILL');
        }, graceMs),
      );
    };
    function abort(): void {
      stop({ kind: 'aborted' });
    }

    if (group !== undefined) {
      liveGroups.add(group);
    }
    if (options.timeoutMs !== undefined) {
      const afterMs = options.timeoutMs;
      timers.push(
        setTimeout(() => {
          stop({ kind: 'timed-out', afterMs });
        }, afterMs),
      );
    }
    options.signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    // A child that exits before reading its whole input is judged on how it ended, not on the broken pipe.
    child.stdin.on('error', () => undefined);
    child.on('error', (error: Error) => {
      if (child.pid === undefined) {
        settle({ kind: 'unstartable', reason: error.message });
      }
    });
    child.on('exit', () => {
      timers.push(
        setTimeout(() => {
          child.stdout.destroy();
          child.stderr.destroy();
        }, DRAIN_MS),
      );
    });
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      settle(stopped ?? (code === null ? { kind: 'killed', signal: signal ?? 'SIGKILL' } : { kind: 'exited', code }));
    });
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });
}

export type RunOptions = ProcessOptions &
  Readonly<{
    /** Exit codes that count as success, `[0]` when absent. */
    successCodes?: readonly number[];
  }>;

export type RunResult = Readonly<{ exitCode: number; stdout: Buffer; stderr: Buffer }>;

/** A child process that did not exit with one of its success codes. */
export class ProcessError extends Error {
  override readonly name = 'ProcessError';
  readonly command: string;
  readonly exit: Exit;
  readonly stdout: Buffer;
  readonly stderr: Buffer;

  constructor(command: string, captured: Captured) {
    const stderr = captured.stderr.toString('utf8');
    super(`${command} : ${describeExit(captured.exit)}${stderr === '' ? '' : `\n${stderr.slice(-TAIL_LENGTH)}`}`);
    this.command = command;
    this.exit = captured.exit;
    this.stdout = captured.stdout;
    this.stderr = captured.stderr;
  }
}

const describeCommand = (command: string, args: readonly string[]): string => [command, ...args].join(' ');

/** Runs `command` like `capture` and resolves only when it exited with a success code. */
export async function run(command: string, args: readonly string[], options: RunOptions): Promise<RunResult> {
  const captured = await capture(command, args, options);
  const successCodes = options.successCodes ?? [0];
  if (captured.exit.kind === 'exited' && successCodes.includes(captured.exit.code)) {
    return { exitCode: captured.exit.code, stdout: captured.stdout, stderr: captured.stderr };
  }
  throw new ProcessError(describeCommand(command, args), captured);
}

/** Standard output of a successful run as text; output that is not valid UTF-8 is an error, never a guess. */
export async function runText(command: string, args: readonly string[], options: RunOptions): Promise<string> {
  const { stdout } = await run(command, args, options);
  const text = decodeUtf8(stdout);
  if (text === null) {
    throw new Error(`${describeCommand(command, args)} : sortie qui n’est pas de l’UTF-8 valide`);
  }
  return text;
}

/** Runs `command` on the terminal of the caller, for checks whose output a person reads live. */
export async function runAttached(
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd: string; env?: Environment }>,
): Promise<Exit> {
  return new Promise<Exit>((resolve) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, stdio: 'inherit' });
    child.on('error', (error: Error) => {
      if (child.pid === undefined) {
        resolve({ kind: 'unstartable', reason: error.message });
      }
    });
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      resolve(code === null ? { kind: 'killed', signal: signal ?? 'SIGKILL' } : { kind: 'exited', code });
    });
  });
}
