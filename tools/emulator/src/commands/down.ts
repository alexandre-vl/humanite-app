import type { ExitCode } from '@huma/kit/cli';
import { adbFor, captureAdb, deviceState } from '../android/adb.ts';
import { dockerContext, dockerUnderGuardLock, guardRunWindowMs, inspectContainer } from '../docker.ts';
import { currentStatus, guardProblems, observeGuard } from '../guard/observe.ts';
import { armCommands, disarmCommands, renderRootCommands, repairCommands } from '../guard/root-commands.ts';
import { readHostReference } from '../host/reference.ts';
import { driftFindings, residueFindings, residueOf, sampleHost } from '../host/sample.ts';
import type { Session } from '../session.ts';
import type { Step } from '../steps.ts';
import { blocked, done, precondition, runReported, todo } from '../steps.ts';

/**
 * The steps of `emulator:down`: once a run of the root guard has seen the container, adb lets go of it, the container
 * goes away under the guard's lock, and the guard restores the host once more, which a last sample checks.
 */
export function downSteps(session: Session): readonly Step[] {
  const { config } = session;
  const context = dockerContext(session);
  const adb = adbFor(session);
  return [
    {
      id: 'guard-saw-container',
      summary: 'conteneur vu par le garde root, qui restaurera l’hôte après lui',
      check: async () => {
        const container = await inspectContainer(context, config.container);
        if (container === null) {
          return done('conteneur déjà absent');
        }
        const observation = await observeGuard(config);
        const status = currentStatus(observation);
        if (status === null || observation.timer.activeState !== 'active') {
          return blocked(guardProblems(observation, config), armCommands(config));
        }
        return status.container.startedAt === container.startedAt
          ? done(`vu au passage ${status.mode}`)
          : todo('pas encore vu');
      },
      apply: null,
      settleMs: guardRunWindowMs(session),
    },
    {
      id: 'adb-disconnected',
      summary: `adb déconnecté de ${adb.serial}`,
      check: async () => ((await deviceState(adb)) === null ? done('déconnecté') : todo('connecté')),
      apply: async () => {
        await captureAdb(adb, ['disconnect', adb.serial], false, 15_000);
      },
      settleMs: 10_000,
    },
    {
      id: 'container-removed',
      summary: `conteneur ${config.container} supprimé, volume ${config.volume} gardé`,
      check: async () =>
        (await inspectContainer(context, config.container)) === null ? done('absent') : todo('présent'),
      apply: async () => {
        await dockerUnderGuardLock(session, ['rm', '--force', config.container], guardRunWindowMs(session) + 60_000);
      },
      settleMs: 30_000,
    },
    {
      id: 'guard-stopped',
      summary: 'hôte restauré par le garde root après le conteneur',
      check: async () => {
        const observation = await observeGuard(config);
        const findings = guardProblems(observation, config);
        const status = currentStatus(observation);
        if (status === null && observation.timer.activeState !== 'active') {
          // No guard ran on this boot of the host: what a user can read of it must then hold no write of Android.
          const residue = residueOf(await sampleHost());
          return residue.length === 0
            ? done('garde non armé, aucune écriture d’Android sur l’hôte')
            : blocked(residueFindings(residue), repairCommands(config));
        }
        if (findings.length > 0 || status === null) {
          return blocked(findings);
        }
        const closed =
          status.phase === 'idle' &&
          status.container.status === 'absent' &&
          status.restoredStartedAt === null &&
          status.remaining.length === 0;
        return closed
          ? done(`${String(status.changes.length)} écart(s) traité(s) au passage ${status.mode}`)
          : todo(`phase ${status.phase} (${status.mode})`);
      },
      apply: null,
      settleMs: 2 * guardRunWindowMs(session),
    },
    precondition('host-restored', 'hôte identique à l’échantillon d’avant Android, relu sans root', async () => {
      const reference = await readHostReference(session);
      if (reference === null) {
        return done('aucun échantillon d’avant Android à comparer');
      }
      const findings = driftFindings(reference, await sampleHost());
      return findings.length === 0 ? done(`${String(reference.size)} entrées comparées`) : blocked(findings);
    }),
  ];
}

export async function emulatorDown(session: Session): Promise<ExitCode> {
  const report = await runReported(session, downSteps(session));
  if (report.failure !== null) {
    return 1;
  }
  session.print('✓ émulateur arrêté ; le garde root veille encore sur l’hôte, jusqu’à :');
  session.print(renderRootCommands(disarmCommands(session.config)));
  return 0;
}
