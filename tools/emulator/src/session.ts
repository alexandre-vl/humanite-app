import { homedir } from 'node:os';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import type { EmulatorConfig } from './config.ts';

/** What every emulator command runs with: the workspace, the configuration, what stops it and where it reports. */
export type Session = Readonly<{
  root: string;
  config: EmulatorConfig;
  signal: AbortSignal;
  print: (text: string) => void;
}>;

/** A path of the Android SDK, installed under the home directory. */
const sdkPath = (config: EmulatorConfig, ...segments: readonly string[]): string =>
  join(homedir(), config.androidSdk, ...segments);

export const adbExecutable = (config: EmulatorConfig): string => sdkPath(config, 'platform-tools', 'adb');

export const aapt2Executable = (config: EmulatorConfig): string =>
  sdkPath(config, 'build-tools', config.buildTools, 'aapt2');

export const androidHome = (config: EmulatorConfig): string => sdkPath(config);

export const adbSerial = (config: EmulatorConfig): string => `${config.adb.host}:${String(config.adb.port)}`;

export const appRoot = (root: string): string => join(root, APP_DIRECTORY);

/** The APK of the dev client Gradle builds. */
export const debugApk = (root: string): string =>
  join(appRoot(root), 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

/** Where the emulator commands keep what one of them leaves for another: never committed, never shared. */
export const cacheDirectory = (root: string): string => join(root, 'node_modules', '.cache', 'emulator');

/** The lock the root guard holds during each run, which `docker run` and `docker rm` take too. */
export const guardLock = (config: EmulatorConfig): string => join(config.guard.runDirectory, 'lock');

/** The session of a command run from a terminal: nothing aborts it but the signals that stop the process. */
export const commandSession = (root: string, config: EmulatorConfig, print: (text: string) => void): Session => ({
  root,
  config,
  signal: new AbortController().signal,
  print,
});
