import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import type { ExitCode } from '@huma/kit/cli';
import { describeExit, runAttached } from '@huma/kit/process';
import { adbFor, deviceShell, deviceState, parseReverseList, runAdb } from '../android/adb.ts';
import { devClientScheme, readApkManifest } from '../android/apk.ts';
import type { EmulatorConfig } from '../config.ts';
import type { Session } from '../session.ts';
import { aapt2Executable, adbSerial, cacheDirectory, debugApk } from '../session.ts';
import { toolDirectory } from '../tools.ts';
import { metroRunning } from './metro.ts';

/** The flows Maestro runs, beside the app they test. */
export const E2E_DIRECTORY = `${APP_DIRECTORY}/e2e`;

/** The deep link that opens the app of `scheme` in the dev client, served by Metro on the loopback, with no screen of its own. */
export const devClientLink = (scheme: string, config: EmulatorConfig): string =>
  `${scheme}://expo-development-client/?${new URLSearchParams({
    url: `http://127.0.0.1:${String(config.metroPort)}`,
    ...config.devClientFlags,
  }).toString()}`;

/** The arguments of Maestro that run every flow on the emulator, the app and its link given as variables of the flows. */
export const maestroArguments = (
  session: Session,
  flows: Readonly<{ appId: string; link: string; output: string }>,
): readonly string[] => [
  '--device',
  adbSerial(session.config),
  'test',
  '--no-ansi',
  '--format=JUNIT',
  `--output=${join(flows.output, 'report.xml')}`,
  `--test-output-dir=${flows.output}`,
  '-e',
  `APP_ID=${flows.appId}`,
  '-e',
  `DEV_CLIENT_LINK=${flows.link}`,
  join(session.root, E2E_DIRECTORY),
];

/** Runs the Maestro flows of the app on the emulator, once adb, Metro and the dev client are ready. */
export async function emulatorE2e(session: Session): Promise<ExitCode> {
  const adb = adbFor(session);
  const metro = `tcp:${String(session.config.metroPort)}`;
  const problems = [
    ...((await deviceState(adb)) === 'device' ? [] : [`${adb.serial} non connecté : pnpm emulator:up`]),
    ...((await metroRunning(session.config)) ? [] : ['Metro ne répond pas : pnpm emulator:metro']),
  ];
  if (problems.length === 0) {
    const forwards = parseReverseList(await runAdb(adb, ['reverse', '--list']));
    if (!forwards.some((forward) => forward.remote === metro)) {
      problems.push(`${metro} non joignable depuis Android : pnpm emulator:up`);
    }
  }
  if (problems.length > 0) {
    session.print(problems.map((problem) => `✗ ${problem}`).join('\n'));
    return 1;
  }
  const manifest = await readApkManifest(aapt2Executable(session.config), debugApk(session.root), session.root);
  const installed = (await runAdb(adb, deviceShell(['pm', 'path', manifest.packageName]))).trim();
  if (!installed.startsWith('package:')) {
    session.print(`✗ ${manifest.packageName} non installé : pnpm emulator:install`);
    return 1;
  }
  const output = join(cacheDirectory(session.root), 'e2e', new Date().toISOString().replaceAll(':', '-'));
  await mkdir(output, { recursive: true });
  const [javaHome, maestro] = await Promise.all([toolDirectory(session, 'java'), toolDirectory(session, 'maestro')]);
  const exit = await runAttached(
    join(maestro, 'bin', 'maestro'),
    maestroArguments(session, {
      appId: manifest.packageName,
      link: devClientLink(devClientScheme(manifest), session.config),
      output,
    }),
    {
      cwd: session.root,
      env: {
        ...process.env,
        JAVA_HOME: javaHome,
        PATH: `${join(javaHome, 'bin')}:${process.env['PATH'] ?? ''}`,
        MAESTRO_OPTS: '-Xmx1g',
        MAESTRO_CLI_NO_ANALYTICS: '1',
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      },
      signal: session.signal,
    },
  );
  const passed = exit.kind === 'exited' && exit.code === 0;
  session.print(`${passed ? '✓' : '✗'} parcours Maestro : ${describeExit(exit)} ; captures et rapport dans ${output}`);
  return passed ? 0 : 1;
}
