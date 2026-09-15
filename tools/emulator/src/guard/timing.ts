import type { EmulatorConfig } from '../config.ts';

/**
 * How long each side of the root guard waits for the other, all derived from the durations the configuration measures:
 * a run of the guard and a change of container take the same lock, so each must be ready to wait for the other, and
 * neither may wait on a number the other place chose.
 */

/** What one run of the guard takes once it holds the lock: its wait for Android's boot, then its restore. */
export const guardWorkSeconds = (config: EmulatorConfig): number =>
  config.guard.bootWaitSeconds + config.guard.restoreSeconds;

/** How long a run waits for the lock: as long as `emulator:up` or `down` may hold it around a change of container. */
export const guardLockWaitSeconds = (config: EmulatorConfig): number => config.guard.containerChangeSeconds;

/** The whole of a run, which systemd gives it as its start timeout: its wait for the lock, then its work. */
export const guardRunTimeoutSeconds = (config: EmulatorConfig): number =>
  guardLockWaitSeconds(config) + guardWorkSeconds(config);

/** Without a run ending for this long, the guard no longer answers for the host. */
export const guardStaleSeconds = (config: EmulatorConfig): number =>
  config.guard.tickSeconds + guardRunTimeoutSeconds(config);

/** How long a step waits for the guard to have seen a change of container and treated it. */
export const guardRunWindowMs = (config: EmulatorConfig): number => guardRunTimeoutSeconds(config) * 1_000;

/** How long `emulator:up` and `down` wait for the lock: as long as a run of the guard may hold it. */
export const dockerLockWaitSeconds = (config: EmulatorConfig): number =>
  config.guard.tickSeconds + guardWorkSeconds(config);

/** Their whole wait: the lock, then the change of container it protects. */
export const dockerUnderLockMs = (config: EmulatorConfig): number =>
  (dockerLockWaitSeconds(config) + config.guard.containerChangeSeconds) * 1_000;
