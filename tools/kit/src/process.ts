import type { ChildProcess, SpawnOptions } from 'node:child_process';
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

/** What every child of this process is given, whatever ends it. */
type ChildBase = Readonly<{
  cwd: string;
  /** Complete environment of the child; the current process environment when absent. */
  env?: Environment;
  /** Delay between SIGTERM and SIGKILL when the child is stopped. */
  killGraceMs?: number;
}>;

/**
 * What ends a child, and there is always something: a command with neither budget nor signal holds a hook, a fixture
 * or a check forever the day it blocks on a lock or a stalled filesystem. A command that answers takes a budget; only
 * a server its caller stops itself may rely on its signal alone.
 */
type Stopping =
  /** Stops the child and every process it started once this budget is spent. */
  | Readonly<{ timeoutMs: number; signal?: AbortSignal }>
  /** Stops the child and every process it started when aborted. */
  | Readonly<{ timeoutMs?: number; signal: AbortSignal }>;

/** A child whose outputs the caller collects, and whose input it may write. */
export type ProcessOptions = ChildBase & Stopping & Readonly<{ input?: string | Uint8Array }>;

/** A child that writes on the caller's own terminal. */
export type AttachedOptions = ChildBase & Stopping;

/** A child that runs beside its caller: disposing it stops it, so it has no ending of its own. */
export type HelperOptions = ChildBase;

export type Captured = Readonly<{ exit: Exit; stdout: Buffer; stderr: Buffer }>;

const KILL_GRACE_MS = 2_000;

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
function stopLiveProcesses(): void {
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

/** Where the outputs of a child go: collected for the caller, or written to the caller's own terminal. */
type OutputMode = 'captured' | 'attached';

/**
 * How a child starts, and the name an error gives it. A program and a script each start by their own call to `spawn`,
 * and nothing crosses from one to the other: what a program is given never reaches the call that starts a shell, where
 * a reader of this code, or an analyser, would have to prove it is not read as a script.
 */
type Launch = Readonly<{ name: string; start: (options: SpawnOptions) => ChildProcess }>;

/** `command` started directly, with `args` as its arguments: no shell ever reads them. */
const program = (command: string, args: readonly string[]): Launch => ({
  name: [command, ...args].join(' '),
  start: (options) => spawn(command, args, options),
});

/** `script` given to `/bin/sh` with no argument: what it works on reaches it through its environment. */
const shellScript = (script: string): Launch => ({
  name: `sh -c ${script}`,
  start: (options) => spawn('/bin/sh', ['-c', script], options),
});

/**
 * Starts what `launch` names and resolves how it ended; never rejects. Every child leads its own process group, so
 * stopping it also stops what it started: SIGTERM, then SIGKILL.
 */
async function supervise(
  launch: Launch,
  options: ChildBase & Readonly<{ input?: string | Uint8Array; timeoutMs?: number; signal?: AbortSignal }>,
  mode: OutputMode,
  started: (pid: number) => void = () => undefined,
): Promise<Captured> {
  const empty = Buffer.alloc(0);
  if (options.signal?.aborted === true) {
    return { exit: { kind: 'aborted' }, stdout: empty, stderr: empty };
  }
  const graceMs = options.killGraceMs ?? KILL_GRACE_MS;
  return new Promise<Captured>((resolve) => {
    const child = launch.start({
      cwd: options.cwd,
      env: options.env ?? process.env,
      // An attached child in its own process group must not read the terminal, which would stop it.
      stdio: mode === 'captured' ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
      detached: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timers: NodeJS.Timeout[] = [];
    const group = child.pid;
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
    if (child.pid !== undefined) {
      started(child.pid);
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
    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
    // A child that exits before reading its whole input is judged on how it ended, not on the broken pipe.
    child.stdin?.on('error', () => undefined);
    child.on('error', (error: Error) => {
      if (child.pid === undefined) {
        settle({ kind: 'unstartable', reason: error.message });
      }
    });
    child.on('exit', () => {
      timers.push(
        setTimeout(() => {
          child.stdout?.destroy();
          child.stderr?.destroy();
        }, DRAIN_MS),
      );
    });
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      settle(stopped ?? (code === null ? { kind: 'killed', signal: signal ?? 'SIGKILL' } : { kind: 'exited', code }));
    });
    if (options.input === undefined) {
      child.stdin?.end();
    } else {
      child.stdin?.end(options.input);
    }
  });
}

/** Runs `command` without a shell, feeds it `input` and collects both outputs; never rejects. */
export const capture = async (command: string, args: readonly string[], options: ProcessOptions): Promise<Captured> =>
  supervise(program(command, args), options, 'captured');

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

/** Starts what `launch` names like `capture`, and resolves only when it exited with a success code. */
async function runLaunch(launch: Launch, options: RunOptions): Promise<RunResult> {
  const captured = await supervise(launch, options, 'captured');
  const successCodes = options.successCodes ?? [0];
  if (captured.exit.kind === 'exited' && successCodes.includes(captured.exit.code)) {
    return { exitCode: captured.exit.code, stdout: captured.stdout, stderr: captured.stderr };
  }
  throw new ProcessError(launch.name, captured);
}

/** Standard output of a successful run as text; output that is not valid UTF-8 is an error, never a guess. */
async function launchText(launch: Launch, options: RunOptions): Promise<string> {
  const { stdout } = await runLaunch(launch, options);
  const text = decodeUtf8(stdout);
  if (text === null) {
    throw new Error(`${launch.name} : sortie qui n’est pas de l’UTF-8 valide`);
  }
  return text;
}

/** Runs `command` like `capture` and resolves only when it exited with a success code. */
export async function run(command: string, args: readonly string[], options: RunOptions): Promise<RunResult> {
  return runLaunch(program(command, args), options);
}

/** Standard output of a successful run as text; output that is not valid UTF-8 is an error, never a guess. */
export async function runText(command: string, args: readonly string[], options: RunOptions): Promise<string> {
  return launchText(program(command, args), options);
}

/**
 * `runText` for a script of `/bin/sh`: the one way a child runs through a shell, for a command line written for one —
 * a hook command of the settings, run as Claude Code runs it. The script takes no argument: what it works on reaches
 * it through its environment, never through its text.
 */
export async function runScriptText(script: string, options: RunOptions): Promise<string> {
  return launchText(shellScript(script), options);
}

/**
 * Runs `command` on the terminal of the caller, for checks whose output a person reads live; its input is closed. A time
 * budget or an abort stops it as `capture` would.
 */
export async function runAttached(command: string, args: readonly string[], options: AttachedOptions): Promise<Exit> {
  return (await supervise(program(command, args), options, 'attached')).exit;
}

/** A child that runs beside its caller, for as long as the caller needs its process: disposing it stops it. */
export type Helper = AsyncDisposable &
  Readonly<{
    pid: number;
    /**
     * Resolves `work`, unless the child ends first: waiting on a helper that is already gone would otherwise time out
     * on a guess, while what the child wrote before dying says what happened.
     */
    whileAlive: <Result>(work: Promise<Result>) => Promise<Result>;
  }>;

/**
 * Starts `command` as a helper, its outputs collected. Disposing it stops the child and every process it started, as a
 * time budget would, and waits until they have ended; so does the exit of this process.
 */
export async function startHelper(command: string, args: readonly string[], options: HelperOptions): Promise<Helper> {
  const controller = new AbortController();
  const { promise: spawned, resolve } = Promise.withResolvers<number | null>();
  const launch = program(command, args);
  const ended = supervise(launch, { ...options, signal: controller.signal }, 'captured', resolve);
  const { name } = launch;
  const pid = await Promise.race([spawned, ended.then(() => null)]);
  if (pid === null) {
    throw new ProcessError(name, await ended);
  }
  return {
    pid,
    whileAlive: async <Result>(work: Promise<Result>): Promise<Result> => {
      const died = ended.then((captured): never => {
        throw new ProcessError(name, captured);
      });
      // The work usually wins the race; nothing else would then handle the rejection of the losing branch.
      died.catch(() => undefined);
      return Promise.race([work, died]);
    },
    [Symbol.asyncDispose]: async () => {
      controller.abort();
      await ended;
    },
  };
}
