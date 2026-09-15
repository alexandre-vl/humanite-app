import { shellWord } from '@huma/kit/cli';
import type { Captured } from '@huma/kit/process';
import { capture, ProcessError } from '@huma/kit/process';
import type { Session } from '../session.ts';
import { adbExecutable, adbSerial } from '../session.ts';

/** The adb of the SDK, bound to the emulator. */
export type Adb = Readonly<{ executable: string; serial: string; cwd: string; signal: AbortSignal }>;

export const adbFor = (session: Session): Adb => ({
  executable: adbExecutable(session.config),
  serial: adbSerial(session.config),
  cwd: session.root,
  signal: session.signal,
});

const ADB_TIMEOUT_MS = 60_000;

/** Output of adb as text, lines ending with LF: adbd ends them with CRLF on some transports. */
export const adbText = (bytes: Buffer): string => bytes.toString('utf8').replaceAll('\r\n', '\n');

/** Runs adb with `args`, for the whole server when `device` is false; never rejects. */
export const captureAdb = async (
  adb: Adb,
  args: readonly string[],
  device = true,
  timeoutMs = ADB_TIMEOUT_MS,
): Promise<Captured> =>
  capture(adb.executable, device ? ['-s', adb.serial, ...args] : args, {
    cwd: adb.cwd,
    signal: adb.signal,
    timeoutMs,
  });

/** Runs adb with `args` and resolves its output; a failure throws with what adb printed. */
export async function runAdb(
  adb: Adb,
  args: readonly string[],
  device = true,
  timeoutMs = ADB_TIMEOUT_MS,
): Promise<string> {
  const captured = await captureAdb(adb, args, device, timeoutMs);
  if (captured.exit.kind !== 'exited' || captured.exit.code !== 0) {
    throw new ProcessError(`adb ${args.join(' ')}`, captured);
  }
  return adbText(captured.stdout);
}

/**
 * The arguments of a command in the device's shell: adb joins them into one line for that shell, so each word is
 * quoted for it, as `&` in a deep link would otherwise end the command.
 */
export const deviceShell = (words: readonly string[]): readonly string[] => ['shell', words.map(shellWord).join(' ')];

/** The value of a system property of the device, `''` when unset; `null` when the device does not answer. */
export async function getprop(adb: Adb, name: string): Promise<string | null> {
  const captured = await captureAdb(adb, deviceShell(['getprop', name]));
  return captured.exit.kind === 'exited' && captured.exit.code === 0 ? adbText(captured.stdout).trim() : null;
}

/** A reverse forward of `adb reverse --list`: the device's `remote` socket reaches the host's `local` one. */
export type ReverseForward = Readonly<{ serial: string; remote: string; local: string }>;

export function parseReverseList(text: string): readonly ReverseForward[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [serial, remote, local] = line.trim().split(/\s+/u);
      if (serial === undefined || remote === undefined || local === undefined) {
        throw new Error(`adb reverse --list : ligne illisible : ${line}`);
      }
      return { serial, remote, local };
    });
}

/** Lines of `adb devices` that list no device: its header, and the notices of a server it had to start. */
const NOT_A_DEVICE = /^(?:List of devices attached|\* )/u;

/** The state of each device of `adb devices`: `device` once usable, `offline` or `unauthorized` otherwise. */
export function parseDevices(text: string): ReadonlyMap<string, string> {
  return new Map(
    text
      .split('\n')
      .filter((line) => line.trim() !== '' && !NOT_A_DEVICE.test(line))
      .map((line) => {
        const [serial, state] = line.trim().split(/\s+/u);
        if (serial === undefined || state === undefined) {
          throw new Error(`adb devices : ligne illisible : ${line}`);
        }
        return [serial, state] as const;
      }),
  );
}

/** The state of the emulator for the adb server, `null` when the server does not list it. */
export const deviceState = async (adb: Adb): Promise<string | null> =>
  parseDevices(await runAdb(adb, ['devices'], false)).get(adb.serial) ?? null;
