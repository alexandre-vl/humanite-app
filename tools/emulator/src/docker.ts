import { createHash } from 'node:crypto';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { arrayField, objectField, parseJson, stringField } from '@huma/kit/json';
import { capture, run } from '@huma/kit/process';
import { isList, isRecord } from '@huma/unknown';
import type { EmulatorCode } from './checks.ts';
import { emulatorFinding } from './checks.ts';
import type { EmulatorConfig } from './config.ts';
import type { Session } from './session.ts';
import { guardLock } from './session.ts';
import { dockerLockWaitSeconds, dockerUnderLockMs } from './guard/timing.ts';
import { CONFIG_SOURCE } from './sources.ts';

/** The label that records, on the container, the fingerprint of the options it was created with. */
export const CONFIG_LABEL = 'dev.humanite.emulator.config';

/** The port adbd listens on inside the container. */
const ADBD_PORT = 5555;

/** What `docker run` needs after its options: the image, then the arguments of Android's init. */
const imageAndArguments = (config: EmulatorConfig): readonly string[] => [
  config.image.id,
  ...Object.entries(config.bootArguments).map(([name, value]) => `${name}=${value}`),
];

const runOptions = (config: EmulatorConfig): readonly string[] => [
  '--detach',
  '--name',
  config.container,
  '--privileged',
  '--network',
  config.network,
  '--publish',
  `${config.adb.host}:${String(config.adb.port)}:${String(ADBD_PORT)}`,
  '--memory',
  `${String(config.limits.memoryGib)}g`,
  // Equal to the memory limit: the container never swaps.
  '--memory-swap',
  `${String(config.limits.memoryGib)}g`,
  '--cpus',
  String(config.limits.cpus),
  '--pids-limit',
  String(config.limits.pids),
  ...Object.entries(config.binder.devices).flatMap(([device, target]) => ['--volume', `/dev/${device}:${target}`]),
  '--volume',
  `${config.volume}:/data`,
];

/** The fingerprint of everything `docker run` creates the container with. */
export const configFingerprint = (config: EmulatorConfig): string =>
  createHash('sha256')
    .update(JSON.stringify([...runOptions(config), ...imageAndArguments(config)]))
    .digest('hex');

/** The arguments of `docker` that create and start the emulator's container. */
export const runArguments = (config: EmulatorConfig): readonly string[] => [
  'run',
  '--label',
  `${CONFIG_LABEL}=${configFingerprint(config)}`,
  ...runOptions(config),
  ...imageAndArguments(config),
];

/** A container as `docker container inspect` describes it. */
export type ContainerState = Readonly<{
  /** `created`, `running`, `paused`, `restarting`, `removing`, `exited` or `dead`. */
  status: string;
  startedAt: string;
  fingerprint: string | null;
}>;

/** The container of `docker container inspect` output, `null` when the list is empty. */
export function parseContainerInspect(text: string): ContainerState | null {
  const list = parseJson(text);
  if (!isList(list)) {
    throw new Error('docker container inspect : sortie illisible');
  }
  const containers: readonly unknown[] = list;
  const [container] = containers;
  if (container === undefined) {
    return null;
  }
  const state = isRecord(container) ? objectField(container, 'State') : null;
  const labels = isRecord(container) ? objectField(container, 'Config') : null;
  const status = state === null ? null : stringField(state, 'Status');
  const startedAt = state === null ? null : stringField(state, 'StartedAt');
  if (status === null || startedAt === null) {
    throw new Error('docker container inspect : état du conteneur illisible');
  }
  const labelTable = labels === null ? null : objectField(labels, 'Labels');
  return { status, startedAt, fingerprint: labelTable === null ? null : stringField(labelTable, CONFIG_LABEL) };
}

/** An image as `docker image inspect` describes it. */
export type ImageState = Readonly<{ id: string; tags: readonly string[]; digests: readonly string[] }>;

const strings = (values: readonly unknown[] | null): readonly string[] =>
  (values ?? []).filter((value): value is string => typeof value === 'string');

/** The image of `docker image inspect` output, `null` when the list is empty. */
export function parseImageInspect(text: string): ImageState | null {
  const list = parseJson(text);
  if (!isList(list)) {
    throw new Error('docker image inspect : sortie illisible');
  }
  const images: readonly unknown[] = list;
  const [image] = images;
  if (image === undefined) {
    return null;
  }
  const id = isRecord(image) ? stringField(image, 'Id') : null;
  if (!isRecord(image) || id === null) {
    throw new Error('docker image inspect : identifiant illisible');
  }
  return { id, tags: strings(arrayField(image, 'RepoTags')), digests: strings(arrayField(image, 'RepoDigests')) };
}

/**
 * What is wrong with the local image for the emulator: missing, another image under the pinned id or digest, or the
 * right image without the human-facing tag the status and the root commands name.
 */
export function imageFindings(image: ImageState | null, config: EmulatorConfig): readonly Diagnostic<EmulatorCode>[] {
  const reference = config.image.reference;
  const finding = (state: string): readonly Diagnostic<EmulatorCode>[] => [
    emulatorFinding('emulator/image', CONFIG_SOURCE, { reference, state }),
  ];
  if (image === null) {
    return finding(`absente : docker pull ${config.image.digest} puis docker tag ${config.image.id} ${reference}`);
  }
  if (image.id !== config.image.id) {
    return finding(`image ${image.id}, attendu ${config.image.id}`);
  }
  if (!image.digests.includes(config.image.digest)) {
    return finding(`empreintes ${image.digests.join(', ')}, attendu ${config.image.digest}`);
  }
  if (image.tags.includes(reference)) {
    return [];
  }
  const tags = image.tags.length === 0 ? '(aucune)' : image.tags.join(', ');
  return finding(`étiquettes ${tags}, attendu ${reference} : docker tag ${config.image.id} ${reference}`);
}

/** What is wrong with an existing container of the emulator: created with other options than the configuration's. */
export function containerFindings(
  container: ContainerState | null,
  config: EmulatorConfig,
): readonly Diagnostic<EmulatorCode>[] {
  if (container === null || container.fingerprint === configFingerprint(config)) {
    return [];
  }
  const state = `${container.status}, créé avec d’autres options : pnpm emulator:down puis pnpm emulator:up`;
  return [emulatorFinding('emulator/container-config', CONFIG_SOURCE, { container: config.container, state })];
}

/** Where docker commands run from, and what stops them. */
export type DockerContext = Readonly<{ cwd: string; signal?: AbortSignal }>;

const INSPECT_TIMEOUT_MS = 30_000;

/**
 * The output of `docker <kind> inspect`, `[]` when no such object exists: docker then exits with 1, as it does when
 * the daemon is unreachable, which only its message tells apart.
 */
async function inspect(context: DockerContext, kind: 'container' | 'image', name: string): Promise<string> {
  const captured = await capture('docker', [kind, 'inspect', name], { ...context, timeoutMs: INSPECT_TIMEOUT_MS });
  const stderr = captured.stderr.toString('utf8');
  if (captured.exit.kind === 'exited' && captured.exit.code === 1 && stderr.includes(`No such ${kind}:`)) {
    return '[]';
  }
  if (captured.exit.kind !== 'exited' || captured.exit.code !== 0) {
    throw new Error(`docker ${kind} inspect ${name} : ${stderr.trim()}`);
  }
  return captured.stdout.toString('utf8');
}

export const inspectContainer = async (context: DockerContext, name: string): Promise<ContainerState | null> =>
  parseContainerInspect(await inspect(context, 'container', name));

export const inspectImage = async (context: DockerContext, name: string): Promise<ImageState | null> =>
  parseImageInspect(await inspect(context, 'image', name));

/** Whether docker knows a network or a volume of that name. */
export async function dockerObjectExists(
  context: DockerContext,
  kind: 'network' | 'volume',
  name: string,
): Promise<boolean> {
  const captured = await capture('docker', [kind, 'inspect', name], { ...context, timeoutMs: INSPECT_TIMEOUT_MS });
  if (captured.exit.kind === 'exited' && captured.exit.code === 0) {
    return true;
  }
  const stderr = captured.stderr.toString('utf8');
  if (captured.exit.kind === 'exited' && /no such|not found/iu.test(stderr)) {
    return false;
  }
  throw new Error(`docker ${kind} inspect ${name} : ${stderr.trim()}`);
}

/** Runs `docker` with `args` and resolves its output; a failure throws with what docker printed. */
export async function runDocker(context: DockerContext, args: readonly string[], timeoutMs: number): Promise<string> {
  const { stdout } = await run('docker', args, { ...context, timeoutMs });
  return stdout.toString('utf8');
}

export const dockerContext = (session: Session): DockerContext => ({ cwd: session.root, signal: session.signal });

/**
 * Runs docker holding the lock of the root guard, which `flock` waits for: no run of the guard can then snapshot the
 * host while the container starts or goes away. It waits for the lock as long as a run of the guard may hold it, then
 * gives the change of container its own time.
 */
export async function dockerUnderGuardLock(session: Session, args: readonly string[]): Promise<void> {
  const waitSeconds = String(dockerLockWaitSeconds(session.config));
  await run('flock', ['--exclusive', '--wait', waitSeconds, guardLock(session.config), 'docker', ...args], {
    ...dockerContext(session),
    timeoutMs: dockerUnderLockMs(session.config),
  });
}
