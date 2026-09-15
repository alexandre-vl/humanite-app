import { expect, test } from 'vitest';
import { buildUnitArguments, prebuildArguments } from './build.ts';
import { EMULATOR } from './config.ts';
import { downSteps } from './down.ts';
import { devClientLink, maestroArguments } from './e2e.ts';
import { metroArguments, metroEnvironment } from './metro.ts';
import { commandSession } from './session.ts';
import { upSteps } from './up.ts';

const session = commandSession('/work/humanite', EMULATOR, () => undefined);

test('up checks what root sets up before it starts anything, and adb comes last, after the host is proven restored', () => {
  expect(upSteps(session).map((step) => step.id)).toEqual([
    'binder',
    'guard-installed',
    'guard-armed',
    'image',
    'host-reference',
    'network',
    'volume',
    'container',
    'boot',
    'guard-restored',
    'host-restored',
    'adb',
    'adb-root',
    'lmkd',
    'reverse',
  ]);
});

test('down removes the container only once the guard has seen it, and ends on the host proven restored', () => {
  expect(downSteps(session).map((step) => step.id)).toEqual([
    'guard-saw-container',
    'adb-disconnected',
    'container-removed',
    'guard-stopped',
    'host-restored',
  ]);
});

test('Gradle runs in a capped user service, without swap, first to be killed, on bound CPUs; never through expo run', () => {
  const args = buildUnitArguments(session, { javaHome: '/java', log: '/work/humanite/build.log' });
  expect(args.slice(0, 5)).toEqual([
    '--user',
    '--unit=humanite-gradle-build',
    '--collect',
    '--wait',
    '--working-directory=/work/humanite/apps/mobile/android',
  ]);
  expect(args).toEqual(
    expect.arrayContaining([
      '--property=MemoryHigh=5600M',
      '--property=MemoryMax=6G',
      '--property=MemorySwapMax=0',
      '--property=CPUQuota=600%',
      '--setenv=PATH=/java/bin:/work/humanite/node_modules/.bin:/usr/bin:/bin',
    ]),
  );
  expect(args.slice(args.indexOf('--'))).toEqual([
    '--',
    'taskset',
    '-c',
    '0-1',
    'choom',
    '-n',
    '1000',
    '--',
    './gradlew',
    'assembleDebug',
    '-PreactNativeArchitectures=x86_64',
    '-Pkotlin.compiler.execution.strategy=in-process',
    '-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=768m -Dfile.encoding=UTF-8',
    '--no-daemon',
    '--no-parallel',
    '--no-watch-fs',
    '--max-workers=1',
    '--console=plain',
  ]);
  expect(args.join(' ')).not.toContain('run:android');
  expect(prebuildArguments({ clean: false })).toEqual([
    'prebuild',
    '--platform',
    'android',
    '--no-install',
    '--no-clean',
  ]);
  expect(prebuildArguments({ clean: true })).toEqual(['prebuild', '--platform', 'android', '--no-install']);
});

test('Metro serves the loopback over IPv4, never in CI mode, without network requests', () => {
  expect(metroArguments(EMULATOR)).toEqual(['start', '--dev-client', '--localhost', '--offline', '--port', '8081']);
  expect(metroEnvironment({ CI: '1', NODE_OPTIONS: '--max-old-space-size=4096', HOME: '/home/user' })).toEqual({
    HOME: '/home/user',
    EXPO_NO_TELEMETRY: '1',
    NODE_OPTIONS: '--max-old-space-size=4096 --dns-result-order=ipv4first',
  });
});

test('the dev client link skips the launcher, and Maestro gets the app and its link as flow variables', () => {
  const link = devClientLink('exp+humanite', EMULATOR);
  expect(link).toBe(
    'exp+humanite://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081&disableOnboarding=1&disableAutoLaunch=1&disableFab=1',
  );
  expect(maestroArguments(session, { appId: 'dev.humanite.app', link, output: '/out' })).toEqual([
    '--device',
    '127.0.0.1:5555',
    'test',
    '--no-ansi',
    '--format=JUNIT',
    '--output=/out/report.xml',
    '--test-output-dir=/out',
    '-e',
    'APP_ID=dev.humanite.app',
    '-e',
    `DEV_CLIENT_LINK=${link}`,
    '/work/humanite/apps/mobile/e2e',
  ]);
});
