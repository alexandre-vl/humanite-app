import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import type { ExitCode } from '@huma/kit/cli';
import { ownRepository, statusEntries } from '@huma/kit/git';
import type { Environment } from '@huma/kit/process';
import { capture, describeExit, run, runAttached } from '@huma/kit/process';
import type { EmulatorConfig } from '../config.ts';
import type { Session } from '../session.ts';
import { appRoot, cacheDirectory, expoCli, expoEnvironment } from '../session.ts';
import { QUERY_TIMEOUT_MS } from '../tools.ts';

export type BuildOptions = Readonly<{
  clean: boolean;
  /** The command that waits for a calm host and runs Gradle, `emulator:gradle`, as absolute paths. */
  gradleCommand: readonly [string, ...string[]];
}>;

/** The arguments of Expo's CLI that generate `android/` from the app's configuration, installing nothing. */
export const prebuildArguments = (options: Pick<BuildOptions, 'clean'>): readonly string[] => [
  'prebuild',
  '--platform',
  'android',
  '--no-install',
  ...(options.clean ? [] : ['--no-clean']),
];

/** Where the build writes what it prints: a user service has no terminal. */
const buildLog = (session: Session, startedAt: Date): string =>
  join(cacheDirectory(session.root), `build-${startedAt.toISOString().replaceAll(':', '-')}.log`);

/**
 * The arguments of `systemd-run` that run the rest of the build in a transient user service: owned by the user's
 * service manager, it outlives the process that started it, which an agent's tool may kill when the host runs low on
 * memory while the build still waits for its calm window.
 */
export const buildServiceArguments = (
  session: Session,
  paths: Readonly<{ log: string; command: readonly [string, ...string[]]; environment: Environment }>,
): readonly string[] => [
  '--user',
  `--unit=${session.config.build.serviceUnit}`,
  '--collect',
  '--quiet',
  `--working-directory=${session.root}`,
  `--property=StandardOutput=append:${paths.log}`,
  `--property=StandardError=append:${paths.log}`,
  ...['PATH', 'HOME', 'XDG_RUNTIME_DIR'].flatMap((name) => {
    const value = paths.environment[name];
    return value === undefined ? [] : [`--setenv=${name}=${value}`];
  }),
  '--',
  ...paths.command,
];

/** Paths of the app with a change git sees: prebuild may rewrite none of them, since `android/` alone is generated. */
async function changedAppPaths(session: Session): Promise<ReadonlySet<string>> {
  const entries = await statusEntries(ownRepository(session.root));
  return new Set(entries.map((entry) => entry.path).filter((path) => path.startsWith(`${APP_DIRECTORY}/`)));
}

/** The user unit of the build still running, its watcher service or the scope of Gradle; `null` when none runs. */
export async function runningBuildUnit(root: string, config: EmulatorConfig): Promise<string | null> {
  for (const unit of [`${config.build.serviceUnit}.service`, `${config.build.unit}.scope`]) {
    const active = await capture('systemctl', ['--user', 'is-active', '--quiet', unit], {
      cwd: root,
      timeoutMs: QUERY_TIMEOUT_MS,
    });
    if (active.exit.kind === 'exited' && active.exit.code === 0) {
      return unit;
    }
  }
  return null;
}

/**
 * `android/` from the app's configuration, then the rest of the build handed to a transient user service, which waits
 * for a calm host and runs Gradle: this command returns once the service has started, with the log to follow.
 */
export async function emulatorBuild(session: Session, options: BuildOptions): Promise<ExitCode> {
  const running = await runningBuildUnit(session.root, session.config);
  if (running !== null) {
    session.print(`✗ un build tourne déjà dans ${running} : pnpm emulator:status pour le suivre`);
    return 1;
  }
  const before = await changedAppPaths(session);
  session.print(`▶ expo ${prebuildArguments(options).join(' ')}`);
  const prebuild = await runAttached(expoCli(session.root), prebuildArguments(options), {
    cwd: appRoot(session.root),
    env: expoEnvironment(process.env),
    signal: session.signal,
    timeoutMs: 600_000,
  });
  if (prebuild.kind !== 'exited' || prebuild.code !== 0) {
    session.print(`✗ prebuild : ${describeExit(prebuild)}`);
    return 1;
  }
  const rewritten = [...(await changedAppPaths(session))].filter((path) => !before.has(path));
  if (rewritten.length > 0) {
    session.print(`✗ prebuild a réécrit des fichiers suivis : ${rewritten.join(', ')}`);
    return 1;
  }
  const log = buildLog(session, new Date());
  await mkdir(cacheDirectory(session.root), { recursive: true });
  await run(
    'systemd-run',
    buildServiceArguments(session, { log, command: options.gradleCommand, environment: process.env }),
    { cwd: session.root, signal: session.signal, timeoutMs: 60_000 },
  );
  session.print(
    `✓ build confié à ${session.config.build.serviceUnit}.service : créneau calme, puis Gradle plafonné\n  journal : ${log}\n  suivi : pnpm emulator:status`,
  );
  return 0;
}
