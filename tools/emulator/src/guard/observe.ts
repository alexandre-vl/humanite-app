import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { describeError, errnoCode } from '@huma/kit/errors';
import { runText } from '@huma/kit/process';
import type { EmulatorConfig } from '../config.ts';
import { ROOT_SOURCE } from '../sources.ts';
import type { EmulatorCode, GuardCode } from '../checks.ts';
import { emulatorFinding, guardFinding } from '../checks.ts';
import type { RootFile } from './install.ts';
import { installedHashes, ROOT_FILE_NAMES } from './install.ts';
import type { GuardStatus } from './status.ts';
import { parseGuardStatus } from './status.ts';

/** The state of a systemd unit as `systemctl show` tells it. */
type UnitState = Readonly<{ loadState: string; activeState: string }>;

const parseUnitState = (text: string): UnitState => {
  const value = (property: string): string =>
    new RegExp(`^${property}=(?<value>.*)$`, 'mu').exec(text)?.groups?.['value'] ?? '';
  return { loadState: value('LoadState'), activeState: value('ActiveState') };
};

/** What a user can see of the root guard. */
export type GuardObservation = Readonly<{
  /** The status the guard published, or why it could not be read; `null` when there is none. */
  status: GuardStatus | Readonly<{ unreadable: string }> | null;
  bootId: string;
  /** Now, in seconds since the epoch. */
  now: number;
  timer: UnitState;
  installed: ReadonlyMap<RootFile, string | null>;
}>;

export async function observeGuard(config: EmulatorConfig): Promise<GuardObservation> {
  const statusText = await readFile(join(config.guard.runDirectory, 'status'), 'utf8').catch((error: unknown) => {
    if (errnoCode(error) === 'ENOENT') {
      return null;
    }
    throw error;
  });
  let status: GuardObservation['status'] = null;
  if (statusText !== null) {
    try {
      status = parseGuardStatus(statusText);
    } catch (error) {
      status = { unreadable: describeError(error) };
    }
  }
  const timer = await runText(
    'systemctl',
    ['show', `${config.guard.unit}.timer`, '--property=LoadState', '--property=ActiveState'],
    { cwd: '/' },
  );
  return {
    status,
    bootId: (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim(),
    now: Math.floor(Date.now() / 1000),
    timer: parseUnitState(timer),
    installed: await installedHashes(config.guard.installDirectory),
  };
}

/** A readable status of this boot of the host, `null` otherwise. */
export const currentStatus = (observation: GuardObservation): GuardStatus | null =>
  observation.status === null || 'unreadable' in observation.status || observation.status.bootId !== observation.bootId
    ? null
    : observation.status;

/**
 * What stops the guard from protecting a session: a timer that is not active, a status that is missing, unreadable or
 * from an earlier boot, a run that has not ended for too long, installed files that changed since arming, and every
 * failure a run recorded.
 */
export function guardProblems(
  observation: GuardObservation,
  config: EmulatorConfig,
): readonly Diagnostic<EmulatorCode | GuardCode>[] {
  const findings: Diagnostic<EmulatorCode | GuardCode>[] = [];
  const unit = `${config.guard.unit}.timer`;
  if (observation.timer.activeState !== 'active') {
    const state = `LoadState=${observation.timer.loadState} ActiveState=${observation.timer.activeState}`;
    findings.push(emulatorFinding('emulator/guard-timer', ROOT_SOURCE, { unit, state }));
  }
  const { status } = observation;
  if (status === null) {
    findings.push(
      emulatorFinding('emulator/guard-status', ROOT_SOURCE, { text: 'aucun statut : le garde n’est pas armé' }),
    );
    return findings;
  }
  if ('unreadable' in status) {
    findings.push(emulatorFinding('emulator/guard-status', ROOT_SOURCE, { text: status.unreadable }));
    return findings;
  }
  if (status.bootId !== observation.bootId) {
    const text = `statut d’un démarrage précédent de l’hôte (${status.bootId})`;
    findings.push(emulatorFinding('emulator/guard-status', ROOT_SOURCE, { text }));
    return findings;
  }
  const limit = config.guard.tickSeconds + config.guard.runTimeoutSeconds;
  if (observation.timer.activeState === 'active' && observation.now - status.runEnd > limit) {
    const seconds = String(observation.now - status.runEnd);
    findings.push(emulatorFinding('emulator/guard-stale', ROOT_SOURCE, { seconds, limit: String(limit) }));
  }
  for (const file of ROOT_FILE_NAMES) {
    const armed = status.scripts.get(file);
    const installed = observation.installed.get(file) ?? null;
    if (armed !== installed) {
      const state = `empreinte à l’armement ${armed?.slice(0, 12) ?? 'absente'}, installée ${installed?.slice(0, 12) ?? 'absente'}`;
      findings.push(emulatorFinding('emulator/guard-scripts', ROOT_SOURCE, { file, state }));
    }
  }
  for (const failure of status.failures) {
    const detail = failure.count === 1 ? failure.detail : `${failure.detail} (${String(failure.count)} passages)`;
    findings.push(guardFinding(`root/${failure.reason}`, ROOT_SOURCE, { detail }));
  }
  return findings;
}
