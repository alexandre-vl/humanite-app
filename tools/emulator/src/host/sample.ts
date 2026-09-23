import { readFile, stat } from 'node:fs/promises';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { errnoCode } from '@huma/kit/errors';
import { compareText } from '@huma/kit/text';
import { isRecord } from '@huma/unknown';
import type { AndroidWrite } from '../android-writes.ts';
import { ABSENT, ANDROID_WRITES, VOLATILE_SYSCTLS } from '../android-writes.ts';
import type { EmulatorCode } from '../checks.ts';
import { emulatorFinding } from '../checks.ts';
import type { SnapshotKind } from '../guard/kinds.ts';
import { ANDROID_WRITES_SOURCE } from '../sources.ts';
import { parseMountinfo, visibleMount } from './mounts.ts';
import { attributesOf, procfsAttributes, withFreshProcfs } from './procfs.ts';
import { readableSysctls, sysctlValue } from './sysctls.ts';

/**
 * What a user can read of the host state Android changes, keyed as the root guard keys its records, `KIND<TAB>KEY`:
 * the sysctls a user may read, every /proc entry through a fresh procfs, the listed sysfs paths, and the options and
 * mount points of debugfs and tracefs. tracefs itself is root's alone.
 */
export type HostSample = ReadonlyMap<string, string>;

const recordId = (kind: SnapshotKind, key: string): string => `${kind}\t${key}`;

/** The kinds a sample holds: the others only root can read. */
const SAMPLED_KINDS: ReadonlySet<SnapshotKind> = new Set([
  'sysctl',
  'procattr',
  'sysfsattr',
  'sysfsval',
  'superopts',
  'mountroot',
]);

const DEBUGFS = '/sys/kernel/debug';

const TRACEFS = '/sys/kernel/tracing';

async function readIfPresent<Value>(read: () => Promise<Value>): Promise<Value | null> {
  try {
    return await read();
  } catch (error) {
    if (errnoCode(error) === 'ENOENT' || errnoCode(error) === 'EACCES') {
      return null;
    }
    throw error;
  }
}

export async function sampleHost(): Promise<HostSample> {
  const sample = new Map<string, string>();
  for (const [path, value] of await readableSysctls()) {
    sample.set(recordId('sysctl', path), value);
  }
  for (const [path, attributes] of await withFreshProcfs(procfsAttributes)) {
    sample.set(recordId('procattr', path), attributes);
  }
  for (const write of ANDROID_WRITES) {
    if (write.kind === 'sysfsattr') {
      const stats = await readIfPresent(async () => stat(write.key));
      if (stats !== null) {
        sample.set(recordId('sysfsattr', write.key), attributesOf(stats));
      }
    } else if (write.kind === 'sysfsval') {
      const value = await readIfPresent(async () => readFile(write.key, 'utf8'));
      if (value !== null) {
        sample.set(recordId('sysfsval', write.key), sysctlValue(value));
      }
    }
  }
  const mounts = parseMountinfo(await readFile('/proc/self/mountinfo', 'utf8'));
  for (const point of [DEBUGFS, TRACEFS]) {
    const mount = visibleMount(mounts, point);
    if (mount !== null) {
      sample.set(recordId('superopts', point), mount.superOptions);
      sample.set(recordId('mountroot', point), attributesOf(await stat(point)));
    }
  }
  return sample;
}

/** The value of `write`'s entry in `sample`, `ABSENT` when missing; `null` when a sample never holds its kind. */
const sampledValue = (sample: HostSample, write: AndroidWrite): string | null =>
  SAMPLED_KINDS.has(write.kind) ? (sample.get(recordId(write.kind, write.key)) ?? ABSENT) : null;

/** The entries of the table a sample never holds: tracefs is root's alone, and so are its instances. */
export const UNSAMPLED_WRITES: readonly AndroidWrite[] = ANDROID_WRITES.filter(
  (write) => !SAMPLED_KINDS.has(write.kind),
);

/** A write of Android an earlier session left on the host, and the value it holds now. */
export type Residual = Readonly<{ write: AndroidWrite; value: string }>;

/** The residue a user can see in `sample`: what arming would refuse among the kinds a sample holds. */
export const residueOf = (sample: HostSample): readonly Residual[] =>
  ANDROID_WRITES.flatMap((write): readonly Residual[] => {
    const value = sampledValue(sample, write);
    // An entry the sample does not hold is no write of Android: a sysctl only root may read, the sysfs path of
    // hardware this host lacks, a filesystem it has not mounted. Only where absence is itself the clean value, as
    // for a tracefs instance, does a missing entry say anything.
    if (value === null || value === write.clean || (value === ABSENT && write.clean !== ABSENT)) {
      return [];
    }
    return [{ write, value }];
  });

const shown = (value: string): string => (value === '' ? '(vide)' : value);

export const residueFindings = (residue: readonly Residual[]): readonly Diagnostic<EmulatorCode>[] =>
  residue.map(({ write, value }) =>
    emulatorFinding('emulator/host-residue', ANDROID_WRITES_SOURCE, {
      kind: write.kind,
      key: write.key,
      value: shown(value),
      expected: shown(write.clean),
      from: write.cleanFrom,
    }),
  );

const VOLATILE: ReadonlySet<string> = new Set(VOLATILE_SYSCTLS.map((key) => recordId('sysctl', key)));

/** Every entry both samples hold with different values, but the volatile ones: what a session left changed. */
export const driftFindings = (before: HostSample, after: HostSample): readonly Diagnostic<EmulatorCode>[] =>
  [...before]
    .filter(([id, value]) => !VOLATILE.has(id) && after.has(id) && after.get(id) !== value)
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([id, value]) => {
      const [kind = '', key = ''] = id.split('\t');
      return emulatorFinding('emulator/host-drift', ANDROID_WRITES_SOURCE, {
        kind,
        key,
        before: value,
        after: after.get(id) ?? ABSENT,
      });
    });

/** A sample as JSON, for a later command to compare the host with. */
export const serializeSample = (sample: HostSample): string =>
  `${JSON.stringify(Object.fromEntries(sample), null, 2)}\n`;

export function deserializeSample(text: string): HostSample {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new Error('échantillon de l’hôte illisible');
  }
  return new Map(
    Object.entries(parsed).map(([id, value]) => {
      if (typeof value !== 'string') {
        throw new Error(`échantillon de l’hôte illisible : ${id}`);
      }
      return [id, value] as const;
    }),
  );
}
