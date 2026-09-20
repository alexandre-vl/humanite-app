import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Answers } from './check.ts';

/** The file each answer of a session is kept in, inside the directory that holds the session. */
const SESSION_FILES = {
  props: 'props.txt',
  build: 'build.txt',
  display: 'display.txt',
  frames: 'frames.txt',
  startup: 'startup.txt',
} as const satisfies Readonly<Record<keyof Answers, string>>;

/**
 * What a person types to take a session, which is how one is taken: the phone is not on this machine, and the tool
 * that judges a session must not be the tool that takes it — a measurement nobody else can repeat is an anecdote.
 *
 * The order is not a convenience. The counters are cleared, the reader scrolls, and only then are the frames read:
 * asked before the scrolling, the dump would answer for whatever the app drew while it was starting. The launch is
 * timed from a stopped app, so the number is a cold one and not the reopening of a process still in memory.
 */
export function transcript(pkg: string, serial: string, into: string): readonly string[] {
  const adb = `adb -s ${serial}`;
  const save = (name: keyof Answers): string => `> ${join(into, SESSION_FILES[name])}`;
  return [
    `mkdir -p ${into}`,
    `${adb} shell getprop ${save('props')}`,
    `${adb} shell dumpsys package ${pkg} ${save('build')}`,
    `${adb} shell dumpsys display ${save('display')}`,
    `${adb} shell am force-stop ${pkg}`,
    `${adb} shell am start -n ${pkg}/.MainActivity`,
    `${adb} shell dumpsys gfxinfo ${pkg} reset`,
    '# ouvrir « À la une » et la faire défiler trente secondes, au doigt',
    `${adb} shell dumpsys gfxinfo ${pkg} ${save('frames')}`,
    `${adb} shell am force-stop ${pkg}`,
    `${adb} shell am start -W -n ${pkg}/.MainActivity ${save('startup')}`,
  ];
}

/** Reads back a session taken by the transcript above. A file that is missing is an empty answer, which is refused. */
export async function readSession(directory: string): Promise<Answers> {
  const answers = await Promise.all(
    Object.entries(SESSION_FILES).map(async ([name, file]): Promise<readonly [string, string]> => {
      const text = await readFile(join(directory, file), 'utf8').catch((): string => '');
      return [name, text];
    }),
  );
  const held = new Map(answers);
  return {
    props: held.get('props') ?? '',
    build: held.get('build') ?? '',
    display: held.get('display') ?? '',
    frames: held.get('frames') ?? '',
    startup: held.get('startup') ?? '',
  };
}
