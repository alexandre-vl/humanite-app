import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { errnoCode } from '@huma/kit/errors';
import type { Session } from '../session.ts';
import { cacheDirectory } from '../session.ts';
import type { HostSample } from './sample.ts';
import { deserializeSample, sampleHost, serializeSample } from './sample.ts';

/** Where `emulator:up` leaves the host sample it took before Android ran, for `emulator:down` to compare with. */
const hostReferenceFile = (session: Session): string => join(cacheDirectory(session.root), 'host-before.json');

export async function readHostReference(session: Session): Promise<HostSample | null> {
  try {
    return deserializeSample(await readFile(hostReferenceFile(session), 'utf8'));
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/** Takes the sample of the host a later command compares the host with. */
export async function writeHostReference(session: Session): Promise<void> {
  const file = hostReferenceFile(session);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, serializeSample(await sampleHost()));
}

/** When the sample was taken, in milliseconds since the epoch; 0 when there is none. */
export const hostReferenceTakenAt = async (session: Session): Promise<number> =>
  stat(hostReferenceFile(session)).then(
    (stats) => stats.mtimeMs,
    () => 0,
  );
