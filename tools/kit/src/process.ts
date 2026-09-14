import { spawn } from 'node:child_process';

export type Environment = Readonly<Record<string, string | undefined>>;

export type RunOptions = Readonly<{
  cwd: string;
  /** Complete environment of the child; the current process environment when absent. */
  env?: Environment;
  input?: string | Uint8Array;
  /** Exit codes that count as success, `[0]` when absent. */
  successCodes?: readonly number[];
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

export type RunResult = Readonly<{ exitCode: number; stdout: Buffer; stderr: Buffer }>;

const TAIL_LENGTH = 2000;

/** A child process that could not start, was killed, or exited with a code outside `successCodes`. */
export class ProcessError extends Error {
  override readonly name = 'ProcessError';
  readonly command: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(
    details: Readonly<{ command: string; exitCode: number | null; stdout: string; stderr: string; reason: string }>,
  ) {
    super(
      `${details.command} : ${details.reason}${details.stderr === '' ? '' : `\n${details.stderr.slice(-TAIL_LENGTH)}`}`,
    );
    this.command = details.command;
    this.exitCode = details.exitCode;
    this.stdout = details.stdout;
    this.stderr = details.stderr;
  }
}

const describeCommand = (command: string, args: readonly string[]): string => [command, ...args].join(' ');

/**
 * Runs `command` without a shell and collects both outputs. The input is written whole; a child that exits before
 * reading it is judged on its exit code, never crashes the caller with `EPIPE`.
 */
export async function run(command: string, args: readonly string[], options: RunOptions): Promise<RunResult> {
  const description = describeCommand(command, args);
  const successCodes = options.successCodes ?? [0];
  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let inputError: string | null = null;
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.stdin.on('error', (error: Error) => {
      inputError = error.message;
    });
    child.on('error', (error: Error) => {
      reject(
        new ProcessError({
          command: description,
          exitCode: null,
          stdout: '',
          stderr: '',
          reason: `lancement impossible (${error.message})`,
        }),
      );
    });
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      const result = { exitCode: code ?? -1, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) };
      if (code !== null && successCodes.includes(code)) {
        resolve(result);
        return;
      }
      const ending = code === null ? `arrêté par le signal ${signal ?? 'inconnu'}` : `code de sortie ${String(code)}`;
      reject(
        new ProcessError({
          command: description,
          exitCode: code,
          stdout: result.stdout.toString('utf8'),
          stderr: result.stderr.toString('utf8'),
          reason: inputError === null ? ending : `${ending}, entrée non transmise (${inputError})`,
        }),
      );
    });
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });
}

/** Standard output of a successful run, decoded as UTF-8. */
export async function runText(command: string, args: readonly string[], options: RunOptions): Promise<string> {
  return (await run(command, args, options)).stdout.toString('utf8');
}
