import { join } from 'node:path';
import type { ExitCode } from '@huma/kit/cli';
import type { Environment } from '@huma/kit/process';
import { describeExit, runAttached } from '@huma/kit/process';
import type { EmulatorConfig } from './config.ts';
import type { Session } from './session.ts';
import { appRoot } from './session.ts';

/** The answer of a running Metro to `GET /status`. */
const RUNNING = 'packager-status:running';

/** Whether Metro answers on the configured port of the loopback. */
export async function metroRunning(config: EmulatorConfig): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${String(config.metroPort)}/status`, {
      signal: AbortSignal.timeout(5_000),
    });
    return (await response.text()) === RUNNING;
  } catch {
    return false;
  }
}

/** The arguments of Expo's CLI that start Metro for the dev client, on the loopback only, without network requests. */
export const metroArguments = (config: EmulatorConfig): readonly string[] => [
  'start',
  '--dev-client',
  '--localhost',
  '--offline',
  '--port',
  String(config.metroPort),
];

/**
 * The environment Metro runs with: without `CI`, which freezes the bundle Metro serves, and with IPv4 first, since
 * `--localhost` would otherwise listen on `::1` alone while `adb reverse` reaches 127.0.0.1.
 */
export function metroEnvironment(environment: Environment): Environment {
  const options = [environment['NODE_OPTIONS'], '--dns-result-order=ipv4first'].filter(
    (option) => option !== undefined && option !== '',
  );
  return {
    ...Object.fromEntries(Object.entries(environment).filter(([name]) => name !== 'CI')),
    EXPO_NO_TELEMETRY: '1',
    NODE_OPTIONS: options.join(' '),
  };
}

/** Runs Metro in the foreground until it is stopped. */
export async function emulatorMetro(session: Session): Promise<ExitCode> {
  if (await metroRunning(session.config)) {
    session.print(`✗ Metro répond déjà sur le port ${String(session.config.metroPort)}`);
    return 1;
  }
  const expo = join(appRoot(session.root), 'node_modules', '.bin', 'expo');
  const exit = await runAttached(expo, metroArguments(session.config), {
    cwd: appRoot(session.root),
    env: metroEnvironment(process.env),
    signal: session.signal,
  });
  session.print(`Metro arrêté : ${describeExit(exit)}`);
  return exit.kind === 'exited' && exit.code === 0 ? 0 : 1;
}
