import type { ExitCode } from '@huma/kit/cli';
import { ownRepository } from '@huma/kit/git';
import type { Adb } from '../android/adb.ts';
import { adbFor, captureAdb, deviceShell, deviceState, getprop, parseReverseList, runAdb } from '../android/adb.ts';
import {
  containerFindings,
  dockerContext,
  dockerObjectExists,
  dockerUnderGuardLock,
  imageFindings,
  inspectContainer,
  inspectImage,
  runArguments,
  runDocker,
} from '../docker.ts';
import { guardRunWindowMs } from '../guard/timing.ts';
import { checkInstall } from '../guard/install.ts';
import { currentStatus, guardProblems, observeGuard } from '../guard/observe.ts';
import { armCommands, binderCommands, installRemedy, repairCommands } from '../guard/root-commands.ts';
import { binderFindings, readBinder } from '../host/binder.ts';
import { hostReferenceTakenAt, readHostReference, writeHostReference } from '../host/reference.ts';
import { driftFindings, residueFindings, residueOf, sampleHost } from '../host/sample.ts';
import type { Session } from '../session.ts';
import type { Step } from '../steps.ts';
import { blocked, done, precondition, runReported, todo } from '../steps.ts';

/** The boot of Android in the container, as `getprop` inside it tells. */
async function bootCompleted(session: Session): Promise<boolean> {
  try {
    const output = await runDocker(
      dockerContext(session),
      ['exec', session.config.container, '/system/bin/getprop', 'sys.boot_completed'],
      15_000,
    );
    return output.trim() === '1';
  } catch {
    return false;
  }
}

/** Whether adb reaches the device, after connecting again: adbd drops its TCP connection when it restarts. */
async function reconnected(adb: Adb): Promise<boolean> {
  if ((await deviceState(adb)) === 'device') {
    return true;
  }
  await captureAdb(adb, ['connect', adb.serial], false, 15_000);
  return (await deviceState(adb)) === 'device';
}

const RESTART = 'pnpm emulator:down, puis pnpm emulator:up';

/** A sample of the host no container has run since is taken again when older than this. */
const REFERENCE_FRESH_MS = 60_000;

/**
 * The steps of `emulator:up`, in order: what root must have set up, a sample of the host, the container, Android's
 * boot and the guard's restore of the host, proven by a second sample, then adb as root, lmkd on its minfree levels
 * and Metro's port reachable from Android.
 */
export function upSteps(session: Session): readonly Step[] {
  const { config, root } = session;
  const context = dockerContext(session);
  const adb = adbFor(session);
  const metro = `tcp:${String(config.metroPort)}`;
  return [
    precondition('binder', 'périphériques binder chargés', async () => {
      const findings = binderFindings(await readBinder(config), config);
      return findings.length === 0
        ? done(Object.keys(config.binder.devices).join(', '))
        : blocked(findings, binderCommands(config));
    }),
    precondition('guard-installed', 'garde root installé depuis le dernier commit', async () => {
      const findings = await checkInstall(ownRepository(root), config.guard.installDirectory);
      return findings.length === 0
        ? done(config.guard.installDirectory)
        : blocked(findings, installRemedy(root, config, findings));
    }),
    precondition('guard-armed', 'garde root armé sur ce démarrage de l’hôte, sans échec', async () => {
      const observation = await observeGuard(config);
      const findings = guardProblems(observation, config);
      const status = currentStatus(observation);
      return findings.length === 0 && status !== null
        ? done(`phase ${status.phase} (${status.mode})`)
        : blocked(findings, armCommands(config));
    }),
    precondition('image', 'image Redroid épinglée', async () => {
      const findings = imageFindings(await inspectImage(context, config.image.id), config);
      return findings.length === 0 ? done(config.image.reference) : blocked(findings);
    }),
    {
      id: 'host-reference',
      summary: 'échantillon de l’hôte pris avant Android',
      check: async () => {
        const container = await inspectContainer(context, config.container);
        const reference = await readHostReference(config);
        if (container !== null) {
          return reference === null
            ? blocked(`conteneur ${container.status} sans échantillon d’avant Android : ${RESTART}`)
            : done(`pris avant le conteneur ${container.status}`);
        }
        const residue = residueOf(await sampleHost());
        if (residue.length > 0) {
          return blocked(residueFindings(residue), repairCommands(config));
        }
        return Date.now() - (await hostReferenceTakenAt(config)) < REFERENCE_FRESH_MS
          ? done('pris à l’instant')
          : todo('à prendre');
      },
      apply: async () => {
        await writeHostReference(config);
      },
      settleMs: 0,
    },
    {
      id: 'network',
      summary: `réseau ${config.network}`,
      check: async () =>
        (await dockerObjectExists(context, 'network', config.network)) ? done('présent') : todo('absent'),
      apply: async () => {
        await runDocker(context, ['network', 'create', config.network], 60_000);
      },
      settleMs: 10_000,
    },
    {
      id: 'volume',
      summary: `volume ${config.volume}`,
      check: async () =>
        (await dockerObjectExists(context, 'volume', config.volume)) ? done('présent') : todo('absent'),
      apply: async () => {
        await runDocker(context, ['volume', 'create', config.volume], 60_000);
      },
      settleMs: 10_000,
    },
    {
      id: 'container',
      summary: `conteneur ${config.container} en marche, aux options de la configuration`,
      check: async () => {
        const container = await inspectContainer(context, config.container);
        if (container === null) {
          return todo('absent');
        }
        const findings = containerFindings(container, config);
        if (findings.length > 0) {
          return blocked(findings);
        }
        return container.status === 'running'
          ? done(`démarré le ${container.startedAt}`)
          : blocked(`conteneur ${container.status} : ${RESTART}`);
      },
      apply: async () => {
        await dockerUnderGuardLock(session, runArguments(config));
      },
      settleMs: 30_000,
    },
    {
      id: 'boot',
      summary: 'Android démarré',
      check: async () => ((await bootCompleted(session)) ? done('sys.boot_completed=1') : todo('en cours')),
      apply: null,
      settleMs: config.bootTimeoutMs,
    },
    {
      id: 'guard-restored',
      summary: 'hôte restauré par le garde root pour ce démarrage du conteneur',
      check: async () => {
        const container = await inspectContainer(context, config.container);
        const observation = await observeGuard(config);
        const findings = guardProblems(observation, config);
        const status = currentStatus(observation);
        if (findings.length > 0 || status === null) {
          return blocked(findings);
        }
        const restored =
          status.phase === 'restored' &&
          container !== null &&
          status.restoredStartedAt === container.startedAt &&
          status.remaining.length === 0;
        return restored
          ? done(`${String(status.changes.length)} écart(s) traité(s) au passage ${status.mode}`)
          : todo(`phase ${status.phase} (${status.mode})`);
      },
      apply: null,
      settleMs: 2 * guardRunWindowMs(config),
    },
    precondition('host-restored', 'hôte identique à l’échantillon d’avant Android, relu sans root', async () => {
      const reference = await readHostReference(config);
      if (reference === null) {
        return blocked(`aucun échantillon d’avant Android : ${RESTART}`);
      }
      const findings = driftFindings(reference, await sampleHost());
      return findings.length === 0 ? done(`${String(reference.size)} entrées comparées`) : blocked(findings);
    }),
    {
      id: 'adb',
      summary: `adb connecté à ${adb.serial}`,
      check: async () => ((await deviceState(adb)) === 'device' ? done('device') : todo('non connecté')),
      apply: async () => {
        await runAdb(adb, ['start-server'], false);
        await captureAdb(adb, ['connect', adb.serial], false, 15_000);
      },
      settleMs: 30_000,
    },
    {
      id: 'adb-root',
      summary: 'adbd en root',
      check: async () => {
        if (!(await reconnected(adb))) {
          return todo('adbd redémarre');
        }
        const uid = await captureAdb(adb, deviceShell(['id', '-u']));
        return uid.stdout.toString('utf8').trim() === '0' ? done('uid 0') : todo('uid non root');
      },
      apply: async () => {
        await captureAdb(adb, ['root']);
      },
      settleMs: 30_000,
    },
    {
      id: 'lmkd',
      summary: 'lmkd sur ses seuils minfree',
      check: async () =>
        (await getprop(adb, config.lmkd.minfreeLevelsProperty)) === 'true'
          ? done(`${config.lmkd.minfreeLevelsProperty}=true`)
          : todo('seuils de pression'),
      apply: async () => {
        await runAdb(adb, deviceShell(['setprop', config.lmkd.minfreeLevelsProperty, 'true']));
        await runAdb(adb, deviceShell(['setprop', config.lmkd.reinitProperty, '1']));
      },
      settleMs: 10_000,
    },
    {
      id: 'reverse',
      summary: `port ${String(config.metroPort)} de Metro joignable depuis Android`,
      check: async () =>
        parseReverseList(await runAdb(adb, ['reverse', '--list'])).some(
          (forward) => forward.remote === metro && forward.local === metro,
        )
          ? done(`${metro} → ${metro}`)
          : todo('absent'),
      apply: async () => {
        await runAdb(adb, ['reverse', metro, metro]);
      },
      settleMs: 10_000,
    },
  ];
}

export async function emulatorUp(session: Session): Promise<ExitCode> {
  const report = await runReported(session, upSteps(session));
  if (report.failure !== null) {
    return 1;
  }
  session.print(`✓ émulateur prêt sur ${adbFor(session).serial}`);
  return 0;
}
