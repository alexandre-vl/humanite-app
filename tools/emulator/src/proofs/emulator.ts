import { join } from 'node:path';
import { createRepository, fixtureFactory } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import type { EmulatorCode } from '../checks.ts';
import { isEmulatorCode } from '../checks.ts';
import { EMULATOR } from '../config.ts';
import type { ContainerState, ImageState } from '../docker.ts';
import { configFingerprint, containerFindings, imageFindings } from '../docker.ts';
import { checkInstall, ROOT_FILE_NAMES } from '../guard/install.ts';
import type { GuardObservation } from '../guard/observe.ts';
import { guardProblems } from '../guard/observe.ts';
import type { GuardStatus } from '../guard/status.ts';
import { guardStaleSeconds } from '../guard/timing.ts';
import { binderFindings } from '../host/binder.ts';
import type { HostSample } from '../host/sample.ts';
import { driftFindings, residueFindings, residueOf } from '../host/sample.ts';
import { ROOT_SOURCE } from '../sources.ts';

/**
 * Fixtures of the emulator commands: each finding function is driven with a state built by hand, so that every code
 * a command can report is proven without a host, docker or a running guard. The root guard's own codes are proven by
 * running its library, in `root.ts`.
 */

const define = fixtureFactory<EmulatorCode>();

const codesOf = (findings: readonly Readonly<{ code: EmulatorCode }>[]): readonly EmulatorCode[] =>
  findings.map((finding) => finding.code);

/** The binder devices the configuration expects, each a character device open to all. */
const soundNodes = (): Map<string, Readonly<{ character: boolean; mode: number }> | null> =>
  new Map(Object.keys(EMULATOR.binder.devices).map((device) => [`/dev/${device}`, { character: true, mode: 0o666 }]));

/** An image with the pinned id and digest, tagged with the reference, unless `overrides` says otherwise. */
const image = (overrides: Partial<ImageState> = {}): ImageState => ({
  id: EMULATOR.image.id,
  tags: [EMULATOR.image.reference],
  digests: [EMULATOR.image.digest],
  ...overrides,
});

const BINDER_DEVICES = Object.keys(EMULATOR.binder.devices).join(',');

/** A host sample holding the clean value of the few writes a proof needs, with `overrides`. */
const sample = (overrides: Readonly<Record<string, string>> = {}): HostSample =>
  new Map(Object.entries({ 'sysctl\t/proc/sys/kernel/hung_task_warnings': '10', ...overrides }));

const BOOT = 'c782471d-2ec0-48ae-af2b-d25ccc4cf445';

const SCRIPTS = new Map([
  ['arm.sh', 'a'],
  ['guard.sh', 'g'],
  ['disarm.sh', 'd'],
  ['lib.sh', 'l'],
  ['tracked.tsv', 't'],
] as const);

const STATUS: GuardStatus = {
  bootId: BOOT,
  armedAt: 1_000,
  phase: 'idle',
  mode: 'idle',
  container: { status: 'absent', startedAt: null },
  restoredStartedAt: null,
  runEnd: 1_100,
  scripts: new Map(SCRIPTS),
  changes: [],
  remaining: [],
  failures: [],
};

const observation = (overrides: Partial<GuardObservation> = {}): GuardObservation => ({
  status: STATUS,
  bootId: BOOT,
  now: 1_120,
  timer: { loadState: 'loaded', activeState: 'active' },
  installed: new Map(SCRIPTS),
  ...overrides,
});

/** Codes of the emulator commands among what an observation raises; the root guard's own codes go through `root.ts`. */
const guardCodes = (overrides: Partial<GuardObservation>): readonly EmulatorCode[] =>
  guardProblems(observation(overrides), EMULATOR)
    .map((finding) => finding.code)
    .filter(isEmulatorCode);

/** Sets up a repository whose root sources are committed and one is left modified, and never installs them. */
async function installFindings(): Promise<readonly EmulatorCode[]> {
  await using directory = await temporaryDirectory('emulator-install');
  const sources = Object.fromEntries(ROOT_FILE_NAMES.map((file) => [`${ROOT_SOURCE}/${file}`, `contenu ${file}\n`]));
  const repository = await createRepository(join(directory.path, 'repo'), {
    commits: [{ files: sources }],
    worktree: { ...sources, [`${ROOT_SOURCE}/lib.sh`]: 'modifié\n' },
  });
  return codesOf(await checkInstall(repository, join(directory.path, 'install')));
}

const BINDER_FIXTURES = [
  define('emulator/binder-unloaded', 'le module binder n’est pas chargé', ['emulator/binder-module'], async () =>
    Promise.resolve(codesOf(binderFindings({ devices: null, nodes: soundNodes() }, EMULATOR))),
  ),
  define(
    'emulator/binder-device-mode',
    'un périphérique binder n’est pas ouvert à tous',
    ['emulator/binder-device'],
    async () => {
      const nodes = soundNodes();
      nodes.set(`/dev/${Object.keys(EMULATOR.binder.devices)[0] ?? ''}`, { character: true, mode: 0o600 });
      return Promise.resolve(codesOf(binderFindings({ devices: BINDER_DEVICES, nodes }, EMULATOR)));
    },
  ),
  define('emulator/valid-binder', 'le module binder et ses périphériques sont ceux de la configuration', [], async () =>
    Promise.resolve(codesOf(binderFindings({ devices: BINDER_DEVICES, nodes: soundNodes() }, EMULATOR))),
  ),
] as const;

const IMAGE_FIXTURES = [
  define('emulator/image-absent', 'l’image Redroid n’est pas là', ['emulator/image'], async () =>
    Promise.resolve(codesOf(imageFindings(null, EMULATOR))),
  ),
  define(
    'emulator/image-untagged',
    'l’image épinglée est là mais sans l’étiquette que le statut nomme',
    ['emulator/image'],
    async () => Promise.resolve(codesOf(imageFindings(image({ tags: [] }), EMULATOR))),
  ),
  define('emulator/valid-image', 'l’image est celle que la configuration épingle, étiquetée', [], async () =>
    Promise.resolve(codesOf(imageFindings(image(), EMULATOR))),
  ),
] as const;

const CONTAINER: ContainerState = { status: 'running', startedAt: '2026-09-15T00:00:00Z', fingerprint: 'autre' };

const CONTAINER_FIXTURES = [
  define(
    'emulator/container-other-options',
    'un conteneur existant a d’autres options que la configuration',
    ['emulator/container-config'],
    async () => Promise.resolve(codesOf(containerFindings(CONTAINER, EMULATOR))),
  ),
  define('emulator/valid-container', 'un conteneur existant a les options de la configuration', [], async () =>
    Promise.resolve(codesOf(containerFindings({ ...CONTAINER, fingerprint: configFingerprint(EMULATOR) }, EMULATOR))),
  ),
] as const;

const HOST_FIXTURES = [
  define(
    'emulator/host-residue-left',
    'l’hôte garde une écriture d’Android d’une session précédente',
    ['emulator/host-residue'],
    async () =>
      Promise.resolve(
        codesOf(residueFindings(residueOf(sample({ 'sysctl\t/proc/sys/kernel/hung_task_warnings': '65535' })))),
      ),
  ),
  define(
    'emulator/host-drift-session',
    'une session laisse une valeur de l’hôte changée',
    ['emulator/host-drift'],
    async () =>
      Promise.resolve(
        codesOf(driftFindings(sample(), sample({ 'sysctl\t/proc/sys/kernel/hung_task_warnings': '20' }))),
      ),
  ),
  define('emulator/valid-clean-host', 'un hôte propre ne garde aucune écriture d’Android', [], async () =>
    Promise.resolve(codesOf(residueFindings(residueOf(sample())))),
  ),
] as const;

const GUARD_FIXTURES = [
  define(
    'emulator/guard-not-armed',
    'le minuteur du garde root est arrêté et aucun statut n’est publié',
    ['emulator/guard-timer', 'emulator/guard-status'],
    async () =>
      Promise.resolve(guardCodes({ timer: { loadState: 'not-found', activeState: 'inactive' }, status: null })),
  ),
  define(
    'emulator/guard-run-stale',
    'le dernier passage du garde root est trop ancien',
    ['emulator/guard-stale'],
    async () => Promise.resolve(guardCodes({ now: 1_100 + guardStaleSeconds(EMULATOR) + 1 })),
  ),
  define(
    'emulator/guard-scripts-changed',
    'un fichier installé a changé depuis l’armement du garde root',
    ['emulator/guard-scripts'],
    async () => Promise.resolve(guardCodes({ installed: new Map([...SCRIPTS, ['lib.sh', 'changed']]) })),
  ),
  define(
    'emulator/guard-installed-uncommitted',
    'les fichiers du garde root ne sont ni commités ni installés',
    ['emulator/guard-uncommitted', 'emulator/guard-install', 'emulator/guard-path'],
    installFindings,
  ),
  define('emulator/valid-guard', 'un garde armé de ce démarrage, avec les fichiers de son armement', [], async () =>
    Promise.resolve(guardCodes({})),
  ),
] as const;

export const EMULATOR_FIXTURES = [
  ...BINDER_FIXTURES,
  ...IMAGE_FIXTURES,
  ...CONTAINER_FIXTURES,
  ...HOST_FIXTURES,
  ...GUARD_FIXTURES,
] as const;
