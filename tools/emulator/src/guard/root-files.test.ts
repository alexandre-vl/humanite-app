import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { run } from '@huma/kit/process';
import { describe, expect, test } from 'vitest';
import { ABSENT } from '../android-writes.ts';
import { EMULATOR } from '../config.ts';
import { ROOT_FILE_NAMES } from './install.ts';
import { SNAPSHOT_KINDS } from './kinds.ts';
import { GUARD_ACTIONS, GUARD_FAILURES, GUARD_MODES, GUARD_PHASES } from './status.ts';
import { renderTrackedTable } from './tracked.ts';

const ROOT = new URL('../../root/', import.meta.url).pathname;

const read = async (file: string): Promise<string> => readFile(join(ROOT, file), 'utf8');

const SCRIPTS = ROOT_FILE_NAMES.filter((file) => file.endsWith('.sh'));

/** Parsing one script is immediate. */
const PARSE_TIMEOUT_MS = 30_000;

describe('the root scripts', () => {
  test.each(SCRIPTS)('%s is POSIX sh that dash reads', async (file) => {
    await expect(
      run('dash', ['-n', join(ROOT, file)], { cwd: ROOT, timeoutMs: PARSE_TIMEOUT_MS }),
    ).resolves.toMatchObject({ exitCode: 0 });
  });

  test.each(SCRIPTS.filter((file) => file !== 'lib.sh'))(
    '%s stops on any error and sources the installed library',
    async (file) => {
      const lines = (await read(file)).split('\n');
      expect(lines[0]).toBe('#!/bin/sh');
      expect(lines).toContain('set -eu');
      expect(lines).toContain(`. ${EMULATOR.guard.installDirectory}/lib.sh`);
    },
  );

  test('the library fixes its PATH and locale before anything else runs', async () => {
    const commands = (await read('lib.sh')).split('\n').filter((line) => line !== '' && !line.startsWith('#'));
    expect(commands.slice(0, 3)).toEqual(['PATH=/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL=C', 'export PATH LC_ALL']);
  });

  // Sourcing the library sets variables and defines functions; it writes nothing, so a shell can be asked what it
  // builds. Comparing what it answers, rather than the lines it is written with, leaves it free to derive them.
  test('the library names the same host objects as the configuration, from one name', async () => {
    const asked = await run(
      'dash',
      [
        '-c',
        `. ${join(ROOT, 'lib.sh')} && printf '%s\\n' "$NAME" "$LIB" "$RUN" "$TRACKED" "$STATUS_FORMAT" && say hello`,
      ],
      { cwd: ROOT, timeoutMs: PARSE_TIMEOUT_MS },
    );
    expect(asked.stdout.toString('utf8').split('\n')).toEqual([
      EMULATOR.name,
      EMULATOR.guard.installDirectory,
      EMULATOR.guard.runDirectory,
      `${EMULATOR.guard.installDirectory}/tracked.tsv`,
      EMULATOR.guard.statusFormat,
      '',
    ]);
    expect(asked.stderr.toString('utf8')).toBe(`${EMULATOR.name}: hello\n`);
  });

  test('the library writes every word the status reader knows, and nothing reads /proc attributes but the fresh procfs', async () => {
    const library = await read('lib.sh');
    for (const word of [...GUARD_ACTIONS, ...GUARD_FAILURES, ...GUARD_PHASES, ...GUARD_MODES, ...SNAPSHOT_KINDS]) {
      expect(library, word).toMatch(new RegExp(`(?<![\\w-])${word}(?![\\w-])`, 'u'));
    }
    expect(library).toContain(`ABSENT='${ABSENT}'`);
    expect(library).not.toMatch(/\bstat\b[^\n]*\/proc\//u);
  });
});

test('the table holds the settings of the configuration and a row per write of Android', () => {
  const rows = renderTrackedTable(EMULATOR)
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.split('\t'));
  expect(rows).toContainEqual(['setting', 'container', EMULATOR.container]);
  expect(rows).toContainEqual(['setting', 'unit', EMULATOR.guard.unit]);
  expect(rows).toContainEqual(['android', 'procattr', '/proc/sysrq-trigger', '220 0 1000']);
  expect(rows).toContainEqual(['clean', 'procattr', '/proc/sysrq-trigger', '200 0 0']);
  expect(rows).toContainEqual(['android', 'sysctl', '/proc/sys/kernel/modprobe', '']);
  expect(
    rows.every((row) => ['setting', 'minimum', 'android', 'clean', 'volatile', 'skip'].includes(row[0] ?? '')),
  ).toBe(true);
});
