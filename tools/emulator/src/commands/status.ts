import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ExitCode } from '@huma/kit/cli';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { renderDiagnostics } from '@huma/kit/diagnostics';
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
  installCommands,
  renderRootCommands,
  residueCommands,
} from '../guard/root-commands.ts';
import { binderFindings, readBinder } from '../host/binder.ts';
import { missedThresholds, sampleMemory } from '../host/memory.ts';
import { residueFindings, residueOf, sampleHost } from '../host/sample.ts';
import { cacheDirectory, debugApk } from '../session.ts';
import { runningBuildUnit } from './build.ts';

/** One line of the report: a fact that holds, one that blocks the emulator with its findings, or a piece of state. */
type Line =
  | Readonly<{ kind: 'ok' | 'info'; text: string }>
  | Readonly<{ kind: 'blocked'; text: string; findings: readonly Diagnostic<string>[]; remedy: RootCommands | null }>;

const ok = (text: string): Line => ({ kind: 'ok', text });

const info = (text: string): Line => ({ kind: 'info', text });

const checked = (text: string, findings: readonly Diagnostic<string>[], remedy: RootCommands | null = null): Line =>
  findings.length === 0 ? ok(text) : { kind: 'blocked', text, findings, remedy };

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
        ].join('\n');
    }
  });
  return [title, ...body].join('\n');
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
  const context = { cwd: root };
  const devices = Object.keys(config.binder.devices).join(',');
  const binder = binderFindings(await readBinder(config), config);
  const residue = residueOf(await sampleHost());
  const memory = await sampleMemory();
  const missed = missedThresholds(memory, config.build.calm);
  const host: readonly Line[] = [
    checked(`binder : ${devices} en 666`, binder, binderCommands(config)),
    checked(
      'aucune écriture d’Android restée sur l’hôte (lecture sans root)',
      residueFindings(residue),
      residueCommands(residue),
    ),
    info(
      `mémoire : ${String(memory.availableMib)} Mio disponibles, swap libre ${String(memory.swapFreeMib)} Mio, pression avg60 ${String(memory.pressureAvg60)}, user.slice ${String(memory.userSliceMib)} Mio : ${missed.length === 0 ? 'créneau calme pour un build natif' : `pas de créneau calme (${missed.join(', ')})`}`,
    ),
  ];

  const install = await checkInstall(ownRepository(root), config.guard.installDirectory);
  const observation = await observeGuard(config);
  const problems = guardProblems(observation, config);
  const status = currentStatus(observation);
  const armed = observation.timer.activeState === 'active';
  const guard: readonly Line[] = [
    checked(
      `garde root installé depuis le dernier commit dans ${config.guard.installDirectory}`,
      install,
      install.some((finding) => finding.code === 'emulator/guard-uncommitted') ? null : installCommands(root, config),
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

  const image = await inspectImage(context, config.image.id);
  const container = await inspectContainer(context, config.container);
  const docker: readonly Line[] = [
    checked(`image ${config.image.reference} épinglée`, imageFindings(image, config)),
    container === null
      ? info(`conteneur ${config.container} absent`)
      : checked(
          `conteneur ${config.container} ${container.status} depuis ${container.startedAt}`,
          containerFindings(container, config),
        ),
  ];

  const sections = [
    render('Hôte', host),
    render('Garde root', guard),
    render('Docker', docker),
    render('Build natif', await buildLines(root, config)),
  ];
  print(sections.join('\n\n'));
  return [...host, ...guard, ...docker].some((line) => line.kind === 'blocked') ? 1 : 0;
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
  const apk = await stat(debugApk(root)).catch(() => null);
  return [
    info(running === null ? 'aucun build en cours' : `build en cours dans ${running}`),
    ...(latest === undefined ? [] : [info(`dernier journal ${join(cache, latest)} : ${lastLine ?? ''}`)]),
    info(apk === null ? 'APK absent : pnpm emulator:build' : `APK du ${apk.mtime.toISOString()} : ${debugApk(root)}`),
  ];
}
