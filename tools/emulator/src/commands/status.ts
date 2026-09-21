import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExitCode } from '@huma/kit/cli';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { describeError } from '@huma/kit/errors';
import { ownRepository } from '@huma/kit/git';
import { compareText } from '@huma/kit/text';
import type { EmulatorConfig } from '../config.ts';
import { containerFindings, imageFindings, inspectContainer, inspectImage } from '../docker.ts';
import { checkInstall } from '../guard/install.ts';
import { currentStatus, guardProblems, observeGuard } from '../guard/observe.ts';
import type { RootCommands } from '../guard/root-commands.ts';
import {
  armCommands,
  binderCommands,
  disarmCommands,
  installRemedy,
  renderRootCommands,
  repairCommands,
} from '../guard/root-commands.ts';
import { binderFindings, readBinder } from '../host/binder.ts';
import { missedThresholds, sampleMemory } from '../host/memory.ts';
import { residueFindings, residueOf, sampleHost } from '../host/sample.ts';
import { cacheDirectory, variantApk } from '../session.ts';
import { runningBuildUnit } from './build.ts';

/** One line of the report: a fact that holds, one that blocks the emulator with its findings, or a piece of state. */
type Line =
  | Readonly<{ kind: 'ok' | 'info'; text: string }>
  | Readonly<{ kind: 'blocked'; text: string; findings: readonly Diagnostic<string>[]; remedy: RootCommands | null }>;

const ok = (text: string): Line => ({ kind: 'ok', text });

const info = (text: string): Line => ({ kind: 'info', text });

const checked = (text: string, findings: readonly Diagnostic<string>[], remedy: RootCommands | null = null): Line =>
  findings.length === 0 ? ok(text) : { kind: 'blocked', text, findings, remedy };

/** A blocking line that stands on its text alone: what a section reports when it could not even read its data. */
const blockedLine = (text: string): Line => ({ kind: 'blocked', text, findings: [], remedy: null });

function render(title: string, lines: readonly Line[]): string {
  const body = lines.map((line) => {
    switch (line.kind) {
      case 'ok':
        return `✓ ${line.text}`;
      case 'info':
        return `· ${line.text}`;
      case 'blocked':
        return [
          `✗ ${line.text}`,
          renderDiagnostics(line.findings, 'text'),
          ...(line.remedy === null ? [] : [renderRootCommands(line.remedy)]),
        ]
          .filter((part) => part !== '')
          .join('\n');
    }
  });
  return [title, ...body].join('\n');
}

/**
 * Renders one section, turning anything its `produce` throws — a docker that does not answer, a proc file that vanished
 * — into a blocked line rather than a crash. The status command is what a person runs when the emulator is broken, so
 * every section it can still read must show, and a section it cannot read is a finding of its own.
 */
export async function section(
  title: string,
  produce: () => Promise<readonly Line[]>,
): Promise<Readonly<{ text: string; blocked: boolean }>> {
  let lines: readonly Line[];
  try {
    lines = await produce();
  } catch (error) {
    lines = [blockedLine(describeError(error))];
  }
  return { text: render(title, lines), blocked: lines.some((line) => line.kind === 'blocked') };
}

/**
 * Everything `pnpm emulator:up` needs, checked without changing anything: the binder devices and a host free of what
 * an earlier session left, the root guard installed from the last commit and armed on this boot, and the pinned image.
 * Each blocking problem comes with the root commands that solve it. Resolves 1 when anything blocks.
 */
export async function emulatorStatus(
  root: string,
  config: EmulatorConfig,
  print: (text: string) => void,
): Promise<ExitCode> {
  const sections = [
    await section('Hôte', async () => await hostLines(config)),
    await section('Garde root', async () => await guardLines(root, config)),
    await section('Docker', async () => await dockerLines(root, config)),
    await section('Build natif', async () => await buildLines(root, config)),
  ];
  print(sections.map((each) => each.text).join('\n\n'));
  return sections.some((each) => each.blocked) ? 1 : 0;
}

/** The host: binder devices open to all, nothing Android left behind that a user can read, and the memory headroom. */
async function hostLines(config: EmulatorConfig): Promise<readonly Line[]> {
  const devices = Object.keys(config.binder.devices).join(',');
  const binder = binderFindings(await readBinder(config), config);
  const residue = residueOf(await sampleHost());
  const memory = await sampleMemory();
  const missed = missedThresholds(memory, config.build.calm);
  return [
    checked(`binder : ${devices} en 666`, binder, binderCommands(config)),
    checked(
      'aucune écriture d’Android restée sur l’hôte (lecture sans root)',
      residueFindings(residue),
      repairCommands(config),
    ),
    info(
      `mémoire : ${String(memory.availableMib)} Mio disponibles, swap libre ${String(memory.swapFreeMib)} Mio, pression avg60 ${String(memory.pressureAvg60)}, user.slice ${String(memory.userSliceMib)} Mio : ${missed.length === 0 ? 'créneau calme pour un build natif' : `pas de créneau calme (${missed.join(', ')})`}`,
    ),
  ];
}

/** The root guard: installed from the last commit, armed on this boot without failure, and when it last ran. */
async function guardLines(root: string, config: EmulatorConfig): Promise<readonly Line[]> {
  const install = await checkInstall(ownRepository(root), config.guard.installDirectory);
  const observation = await observeGuard(config);
  const problems = guardProblems(observation, config);
  const status = currentStatus(observation);
  const armed = observation.timer.activeState === 'active';
  return [
    checked(
      `garde root installé depuis le dernier commit dans ${config.guard.installDirectory}`,
      install,
      installRemedy(root, config, install),
    ),
    checked(
      'garde root armé sur ce démarrage de l’hôte, sans échec',
      problems,
      armed ? disarmCommands(config) : armCommands(config),
    ),
    ...(status === null
      ? []
      : [
          info(
            `dernier passage : phase ${status.phase} (${status.mode}), conteneur ${status.container.status}, il y a ${String(observation.now - status.runEnd)} s`,
          ),
        ]),
  ];
}

/** Docker: the pinned image, and the container of the emulator or that it is absent. */
async function dockerLines(root: string, config: EmulatorConfig): Promise<readonly Line[]> {
  const context = { cwd: root };
  const image = await inspectImage(context, config.image.id);
  const container = await inspectContainer(context, config.container);
  return [
    checked(`image ${config.image.reference} épinglée`, imageFindings(image, config)),
    container === null
      ? info(`conteneur ${config.container} absent`)
      : checked(
          `conteneur ${config.container} ${container.status} depuis ${container.startedAt}`,
          containerFindings(container, config),
        ),
  ];
}

/** Where the native build stands: a unit still running, the last line of its latest log, and the APK it left. */
async function buildLines(root: string, config: EmulatorConfig): Promise<readonly Line[]> {
  const running = await runningBuildUnit(root, config);
  const cache = cacheDirectory(root);
  const logs = (await readdir(cache).catch(() => []))
    .filter((name) => name.startsWith('build-') && name.endsWith('.log'))
    .toSorted(compareText);
  const latest = logs.at(-1);
  const lastLine =
    latest === undefined
      ? null
      : ((await readFile(join(cache, latest), 'utf8'))
          .split('\n')
          .filter((line) => line.trim() !== '')
          .at(-1) ?? '(vide)');
  const apk = await stat(variantApk(root, 'debug')).catch(() => null);
  return [
    info(running === null ? 'aucun build en cours' : `build en cours dans ${running}`),
    ...(latest === undefined ? [] : [info(`dernier journal ${join(cache, latest)} : ${lastLine ?? ''}`)]),
    info(
      apk === null
        ? 'APK absent : pnpm emulator:build'
        : `APK du ${apk.mtime.toISOString()} : ${variantApk(root, 'debug')}`,
    ),
  ];
}
