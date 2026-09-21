import { homedir } from 'node:os';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import type { Environment } from '@huma/kit/process';
import type { VariantName } from './variant.ts';
import { VARIANTS } from './variant.ts';
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

/** The Expo CLI of the app, run from its own directory: the one binary every command that drives Expo invokes. */
export const expoCli = (root: string): string => join(appRoot(root), 'node_modules', '.bin', 'expo');

/** The environment Expo runs with, off telemetry: no version check reaches the network from a command of the emulator. */
export const expoEnvironment = (environment: Environment): Environment => ({ ...environment, EXPO_NO_TELEMETRY: '1' });

/** The APK a variant of Gradle writes: the dev client the container runs, or the package a budget is read on. */
export const variantApk = (root: string, variant: VariantName): string =>
  join(appRoot(root), 'android', 'app', 'build', 'outputs', 'apk', ...VARIANTS[variant].output);

/** Where the emulator commands keep what one of them leaves for another: never committed, never shared. */
export const cacheDirectory = (root: string): string => join(root, 'node_modules', '.cache', 'emulator');

/**
 * Where a command leaves what another command of this boot of the host reads: the container, the guard and the host
 * are the machine's, not a worktree's, and this directory goes away with the boot that made it.
 */
export function runtimeDirectory(config: EmulatorConfig): string {
  const base = process.env['XDG_RUNTIME_DIR'];
  if (base === undefined || base === '') {
    throw new Error(
      'XDG_RUNTIME_DIR absent : ouvrir une session utilisateur systemd avant les commandes de l’émulateur',
    );
  }
  return join(base, config.runtimeDirectory);
}

/** The lock the root guard holds during each run, which `docker run` and `docker rm` take too. */
export const guardLock = (config: EmulatorConfig): string => join(config.guard.runDirectory, 'lock');

/** The session of a command run from a terminal: nothing aborts it but the signals that stop the process. */
export const commandSession = (root: string, config: EmulatorConfig, print: (text: string) => void): Session => ({
  root,
  config,
  signal: new AbortController().signal,
  print,
});
