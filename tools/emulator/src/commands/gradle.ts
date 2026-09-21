import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExitCode } from '@huma/kit/cli';
import type { Environment } from '@huma/kit/process';
import { describeExit, runAttached } from '@huma/kit/process';
import { readApkManifest } from '../android/apk.ts';
import { hostCalmWatch, waitForCalm } from '../host/memory.ts';
import type { Session } from '../session.ts';
import { aapt2Executable, androidHome, appRoot, variantApk } from '../session.ts';
import type { Build } from '../variant.ts';
import { VARIANTS } from '../variant.ts';
import { toolDirectory } from '../tools.ts';

/** The last line the build prints when the APK is built. */
const BUILT = '✓ APK construit';

/** How many CPUs a `taskset` list names: `0-1` is two, `0,3` is two as well. */
export const cpuCount = (affinity: string): number =>
  affinity.split(',').reduce((total, part) => {
    const [first = '', last = first] = part.split('-');
    return total + (Number(last) - Number(first) + 1);
  }, 0);

/**
 * The arguments of `systemd-run` that run Gradle in a transient scope capped as the spike measured it safe: without
 * swap, the Gradle JVM the first process the kernel kills, and the CPUs ninja may use bound by affinity since it
 * ignores the Gradle workers. The quota of the scope says the same in the scheduler's terms, so a process that sets
 * its own affinity gains nothing. A scope keeps the caller's terminal, working directory and environment.
 */
export const gradleScopeArguments = (session: Session, asked: Build): readonly string[] => {
  const { build } = session.config;
  return [
    '--user',
    '--scope',
    `--unit=${build.unit}`,
    '--collect',
    '--quiet',
    `--property=MemoryHigh=${build.memoryHigh}`,
    `--property=MemoryMax=${build.memoryMax}`,
    '--property=MemorySwapMax=0',
    `--property=CPUQuota=${String(cpuCount(build.cpuAffinity) * 100)}%`,
    '--',
    'taskset',
    '-c',
    build.cpuAffinity,
    'choom',
    '-n',
    '1000',
    '--',
    './gradlew',
    VARIANTS[asked.variant].task,
    `-PreactNativeArchitectures=${asked.abi}`,
    ...VARIANTS[asked.variant].properties,
    '-Pkotlin.compiler.execution.strategy=in-process',
    `-Dorg.gradle.jvmargs=${build.gradleJvmArgs}`,
    '--no-daemon',
    '--no-parallel',
    '--no-watch-fs',
    `--max-workers=${String(build.gradleWorkers)}`,
    '--console=plain',
  ];
};

/** The environment of Gradle: the SDK, the pinned JDK, and the node the workspace pins, which Gradle runs to resolve packages. */
export const gradleEnvironment = (session: Session, javaHome: string, environment: Environment): Environment => ({
  ...environment,
  ANDROID_HOME: androidHome(session.config),
  JAVA_HOME: javaHome,
  PATH: [join(javaHome, 'bin'), join(session.root, 'node_modules', '.bin'), environment['PATH'] ?? ''].join(':'),
});

/** Waits for a calm host, then builds the asked APK with Gradle in its capped scope and reads back its manifest. */
export async function emulatorGradle(session: Session, asked: Build): Promise<ExitCode> {
  const { calm } = session.config.build;
  session.print(`▶ ${new Date().toISOString()} attente d’un créneau calme sur l’hôte`);
  const reached = await waitForCalm(
    calm,
    hostCalmWatch(session.signal, (sample, missed, calmInARow) => {
      const state = missed.length === 0 ? `calme ${String(calmInARow)}/${String(calm.samples)}` : missed.join(', ');
      session.print(`  ${new Date().toISOString()} ${state}`);
    }),
  );
  if (!reached) {
    session.print(`✗ aucun créneau calme en ${String(calm.maxWaitMs / 3_600_000)} h : relancer pnpm emulator:build`);
    return 1;
  }
  const javaHome = await toolDirectory(session, 'java');
  session.print(
    `▶ ${new Date().toISOString()} Gradle ${VARIANTS[asked.variant].task} pour ${asked.abi} dans ${session.config.build.unit}.scope`,
  );
  const exit = await runAttached('systemd-run', gradleScopeArguments(session, asked), {
    cwd: join(appRoot(session.root), 'android'),
    env: gradleEnvironment(session, javaHome, process.env),
    signal: session.signal,
  });
  if (exit.kind !== 'exited' || exit.code !== 0) {
    session.print(`✗ ${new Date().toISOString()} Gradle : ${describeExit(exit)}`);
    return 1;
  }
  const apk = variantApk(session.root, asked.variant);
  await access(apk);
  const manifest = await readApkManifest(aapt2Executable(session.config), apk, session.root);
  session.print(
    `${BUILT} ${new Date().toISOString()} : ${manifest.packageName}, targetSdk ${String(manifest.targetSdk)}, enableOnBackInvokedCallback ${String(manifest.backInvokedCallback)}`,
  );
  return 0;
}
