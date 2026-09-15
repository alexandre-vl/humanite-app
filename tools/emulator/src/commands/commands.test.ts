import { expect, test } from 'vitest';
import { EMULATOR } from '../config.ts';
import { commandSession } from '../session.ts';
import { buildServiceArguments, prebuildArguments } from './build.ts';
import { downSteps } from './down.ts';
import { devClientLink, maestroArguments } from './e2e.ts';
import { cpuCount, gradleEnvironment, gradleScopeArguments } from './gradle.ts';
import { metroArguments, metroEnvironment } from './metro.ts';
import { section } from './status.ts';
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

test('the build outlives whoever starts it: the wait and Gradle run in a transient user service', () => {
  const args = buildServiceArguments(session, {
    log: '/work/humanite/node_modules/.cache/emulator/build.log',
    command: ['/work/humanite/node_modules/.bin/node', '/work/humanite/tools/governance/src/cli/emulator-gradle.ts'],
    environment: { PATH: '/usr/bin:/bin', HOME: '/home/user', SECRET: 'x' },
  });
  expect(args).toEqual([
    '--user',
    `--unit=${EMULATOR.build.serviceUnit}`,
    '--collect',
    '--quiet',
    '--working-directory=/work/humanite',
    '--property=StandardOutput=append:/work/humanite/node_modules/.cache/emulator/build.log',
    '--property=StandardError=append:/work/humanite/node_modules/.cache/emulator/build.log',
    '--setenv=PATH=/usr/bin:/bin',
    '--setenv=HOME=/home/user',
    '--',
    '/work/humanite/node_modules/.bin/node',
    '/work/humanite/tools/governance/src/cli/emulator-gradle.ts',
  ]);
  expect(prebuildArguments({ clean: false })).toEqual([
    'prebuild',
    '--platform',
    'android',
    '--no-install',
    '--no-clean',
  ]);
  expect(prebuildArguments({ clean: true })).toEqual(['prebuild', '--platform', 'android', '--no-install']);
});

test('Gradle runs in a capped scope, without swap, first to be killed, on bound CPUs; never through expo run', () => {
  const args = gradleScopeArguments(session);
  expect(args.slice(0, args.indexOf('--'))).toEqual([
    '--user',
    '--scope',
    `--unit=${EMULATOR.build.unit}`,
    '--collect',
    '--quiet',
    '--property=MemoryHigh=5600M',
    '--property=MemoryMax=6G',
    '--property=MemorySwapMax=0',
    '--property=CPUQuota=200%',
  ]);
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
  expect(gradleEnvironment(session, '/java', { PATH: '/usr/bin' })).toMatchObject({
    JAVA_HOME: '/java',
    PATH: '/java/bin:/work/humanite/node_modules/.bin:/usr/bin',
  });
});

test('the CPU cap of the scope says what the affinity says: one list of CPUs, two ways of binding it', () => {
  expect(cpuCount('0-1')).toBe(2);
  expect(cpuCount('3')).toBe(1);
  expect(cpuCount('0,3')).toBe(2);
  expect(cpuCount('0-1,4-6')).toBe(5);
  expect(gradleScopeArguments(session)).toContain(
    `--property=CPUQuota=${String(cpuCount(EMULATOR.build.cpuAffinity) * 100)}%`,
  );
});

test('Metro serves the loopback over IPv4, never in CI mode, without network requests', () => {
  expect(metroArguments(EMULATOR)).toEqual(['start', '--dev-client', '--localhost', '--port', '8081']);
  expect(metroEnvironment({ CI: '1', NODE_OPTIONS: '--max-old-space-size=4096', HOME: '/home/user' })).toEqual({
    HOME: '/home/user',
    EXPO_NO_TELEMETRY: '1',
    EXPO_OFFLINE: '1',
    NODE_OPTIONS: '--max-old-space-size=4096 --dns-result-order=ipv4first',
  });
});

test('a status section that cannot read its data blocks on the error instead of crashing the whole report', async () => {
  const failed = await section('Docker', async () => {
    await Promise.resolve();
    throw new Error('daemon injoignable');
  });
  expect(failed.blocked).toBe(true);
  expect(failed.text).toContain('daemon injoignable');
  const clean = await section('Hôte', async () => {
    await Promise.resolve();
    return [{ kind: 'ok', text: 'binder' }];
  });
  expect([clean.blocked, clean.text.includes('✓ binder')]).toEqual([false, true]);
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
