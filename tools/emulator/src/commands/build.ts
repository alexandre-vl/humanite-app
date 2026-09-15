import { access, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import type { ExitCode } from '@huma/kit/cli';
import { ownRepository, statusEntries } from '@huma/kit/git';
import { capture, describeExit, runAttached } from '@huma/kit/process';
import { readApkManifest } from '../android/apk.ts';
import { hostCalmWatch, waitForCalm } from '../host/memory.ts';
import type { Session } from '../session.ts';
import { aapt2Executable, androidHome, appRoot, cacheDirectory, debugApk } from '../session.ts';
import { toolDirectory } from '../tools.ts';

export type BuildOptions = Readonly<{ clean: boolean }>;

/** Where Gradle writes what the build prints: a user service has no terminal. */
const buildLog = (session: Session): string =>
  join(cacheDirectory(session.root), `gradle-${new Date().toISOString().replaceAll(':', '-')}.log`);

/**
 * The arguments of `systemd-run` that build the debug APK for the emulator's ABI in a transient user service, capped as
 * the spike measured it safe: out of the process tree of whoever started it, without swap, the Gradle JVM the first
 * process the kernel kills, and the CPUs ninja may use bound by affinity since it ignores the Gradle workers.
 */
export function buildUnitArguments(
  session: Session,
  paths: Readonly<{ javaHome: string; log: string }>,
): readonly string[] {
  const { build } = session.config;
  return [
    '--user',
    `--unit=${build.unit}`,
    '--collect',
    '--wait',
    `--working-directory=${join(appRoot(session.root), 'android')}`,
    `--property=MemoryHigh=${build.memoryHigh}`,
    `--property=MemoryMax=${build.memoryMax}`,
    '--property=MemorySwapMax=0',
    `--property=CPUQuota=${build.cpuQuota}`,
    `--property=StandardOutput=append:${paths.log}`,
    `--property=StandardError=append:${paths.log}`,
    `--setenv=ANDROID_HOME=${androidHome(session.config)}`,
    `--setenv=JAVA_HOME=${paths.javaHome}`,
    // Gradle runs node to resolve React Native and Expo: the one the workspace pins.
    `--setenv=PATH=${[join(paths.javaHome, 'bin'), join(session.root, 'node_modules', '.bin'), '/usr/bin', '/bin'].join(':')}`,
    '--',
    'taskset',
    '-c',
    build.cpuAffinity,
    'choom',
    '-n',
    '1000',
    '--',
    './gradlew',
    'assembleDebug',
    `-PreactNativeArchitectures=${build.architectures}`,
    '-Pkotlin.compiler.execution.strategy=in-process',
    `-Dorg.gradle.jvmargs=${build.gradleJvmArgs}`,
    '--no-daemon',
    '--no-parallel',
    '--no-watch-fs',
    `--max-workers=${String(build.gradleWorkers)}`,
    '--console=plain',
  ];
}

/** The arguments of Expo's CLI that generate `android/` from the app's configuration, installing nothing. */
export const prebuildArguments = (options: BuildOptions): readonly string[] => [
  'prebuild',
  '--platform',
  'android',
  '--no-install',
  ...(options.clean ? [] : ['--no-clean']),
];

/** Paths of the app with a change git sees: prebuild may rewrite none of them, since `android/` alone is generated. */
async function changedAppPaths(session: Session): Promise<ReadonlySet<string>> {
  const entries = await statusEntries(ownRepository(session.root));
  return new Set(entries.map((entry) => entry.path).filter((path) => path.startsWith(`${APP_DIRECTORY}/`)));
}

/**
 * `android/` from the app's configuration, then, once the shared host is calm, the debug APK built by Gradle in its
 * capped user service; its manifest is read back to show what was built.
 */
export async function emulatorBuild(session: Session, options: BuildOptions): Promise<ExitCode> {
  const unit = `${session.config.build.unit}.service`;
  const active = await capture('systemctl', ['--user', 'is-active', '--quiet', unit], { cwd: session.root });
  if (active.exit.kind === 'exited' && active.exit.code === 0) {
    session.print(`✗ un build tourne déjà dans ${unit} : attendre sa fin (journalctl --user -u ${unit})`);
    return 1;
  }
  const before = await changedAppPaths(session);
  const expo = join(appRoot(session.root), 'node_modules', '.bin', 'expo');
  session.print(`▶ expo ${prebuildArguments(options).join(' ')}`);
  const prebuild = await runAttached(expo, prebuildArguments(options), {
    cwd: appRoot(session.root),
    env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
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
  session.print('▶ attente d’un créneau calme sur l’hôte');
  const calm = await waitForCalm(
    session.config.build.calm,
    hostCalmWatch(session.signal, (sample, missed, calmInARow) => {
      const state =
        missed.length === 0
          ? `calme ${String(calmInARow)}/${String(session.config.build.calm.samples)}`
          : missed.join(', ');
      session.print(`  ${new Date().toISOString()} ${state}`);
    }),
  );
  if (!calm) {
    session.print('✗ aucun créneau calme dans le délai : relancer plus tard');
    return 1;
  }
  const log = buildLog(session);
  await mkdir(cacheDirectory(session.root), { recursive: true });
  const javaHome = await toolDirectory(session, 'java');
  session.print(`▶ Gradle dans ${unit}, journal ${log}`);
  const gradle = await runAttached('systemd-run', buildUnitArguments(session, { javaHome, log }), {
    cwd: session.root,
    signal: session.signal,
  });
  if (gradle.kind !== 'exited' || gradle.code !== 0) {
    const tail = (await readFile(log, 'utf8').catch(() => '')).split('\n').slice(-30).join('\n');
    session.print(`${tail}\n✗ Gradle : ${describeExit(gradle)}`);
    return 1;
  }
  const apk = debugApk(session.root);
  await access(apk);
  const manifest = await readApkManifest(aapt2Executable(session.config), apk, session.root);
  session.print(
    `✓ ${apk} : ${manifest.packageName}, targetSdk ${String(manifest.targetSdk)}, enableOnBackInvokedCallback ${String(manifest.backInvokedCallback)}`,
  );
  return 0;
}
