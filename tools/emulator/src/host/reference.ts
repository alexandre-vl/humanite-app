import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { errnoCode } from '@huma/kit/errors';
import type { EmulatorConfig } from '../config.ts';
import { runtimeDirectory } from '../session.ts';
import type { HostSample } from './sample.ts';
import { deserializeSample, sampleHost, serializeSample } from './sample.ts';

/**
 * Where `emulator:up` leaves the host sample it took before Android ran, for `emulator:down` to compare with. It lives
 * in the runtime directory of the user rather than in a worktree: there is one host, one container and one guard for
 * every worktree, and a reboot empties it, so no sample of an earlier boot can be taken for this one's.
 */
const hostReferenceFile = (config: EmulatorConfig): string => join(runtimeDirectory(config), 'host-before.json');

export async function readHostReference(config: EmulatorConfig): Promise<HostSample | null> {
  try {
    return deserializeSample(await readFile(hostReferenceFile(config), 'utf8'));
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/** Takes the sample a later command compares the host with, written whole or not at all: a killed write leaves none. */
export async function writeHostReference(config: EmulatorConfig): Promise<void> {
  const file = hostReferenceFile(config);
  await mkdir(runtimeDirectory(config), { recursive: true });
  const partial = `${file}.partial`;
  await writeFile(partial, serializeSample(await sampleHost()));
  await rename(partial, file);
}

/** Forgets the sample, once the host has been compared with it: what is left of it means a session is unfinished. */
export const clearHostReference = async (config: EmulatorConfig): Promise<void> => {
  await rm(hostReferenceFile(config), { force: true });
};

/** When the sample was taken, in milliseconds since the epoch; 0 when there is none. */
export const hostReferenceTakenAt = async (config: EmulatorConfig): Promise<number> =>
  stat(hostReferenceFile(config)).then(
    (stats) => stats.mtimeMs,
    () => 0,
  );
