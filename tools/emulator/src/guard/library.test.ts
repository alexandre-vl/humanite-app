import { existsSync } from 'node:fs';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeTree } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import { run, runText } from '@huma/kit/process';
import { expect, test } from 'vitest';
import { LIBRARY, records } from '../proofs/root.ts';

/** Every snippet of the library these tests run answers at once. */
const TIMEOUT_MS = 30_000;

// `proc_records` and `mount_records` read a file's mode the way GNU stat gives it, and the kernel's own filesystems;
// off Linux (no `/proc`) they read nothing, so those two are skipped here and run on the server (ADR-0010).
const OFF_LINUX = !existsSync('/proc');

/** Runs `body` in dash after the library, its table moved to `directory/tracked.tsv`; resolves its output. */
const library = async (directory: string, body: string): Promise<string> =>
  runText(
    'dash',
    ['-c', `set -eu\n. "$1"\nDIRECTORY=$2\nTRACKED=$DIRECTORY/tracked.tsv\n${body}`, 'dash', LIBRARY, directory],
    { cwd: directory, timeoutMs: TIMEOUT_MS },
  );

test('sysctl records join lines, turn tabs into spaces, mark what cannot be read or written back, and skip what they must', async () => {
  await using directory = await temporaryDirectory('emulator-sysctl');
  await writeTree(directory.path, {
    'tracked.tsv': records([['skip', 'sysctl', `${directory.path}/sys/vm/stat_refresh`]]),
    'sys/kernel/modprobe': '/sbin/modprobe\n',
    'sys/kernel/empty': '\n',
    'sys/kernel/printk': '4\t4\t1\t7\n',
    'sys/fs/binfmt_misc/python': 'enabled\ninterpreter /usr/bin/python3\n',
    'sys/vm/stat_refresh': '0\n',
    'sys/vm/secret': '28\n',
    'sys/net/core/bpf_jit_enable': '1\n',
  });
  await chmod(join(directory.path, 'sys/vm/secret'), 0o200);
  await chmod(join(directory.path, 'sys/vm/secret'), 0o600);
  await writeFile(join(directory.path, 'sys/kernel/readonly'), '1\n', { mode: 0o444 });
  const output = await library(directory.path, 'SYSCTL_ROOT=$DIRECTORY/sys\nsysctl_records | sort');
  const sys = join(directory.path, 'sys');
  expect(output.split('\n').filter((line) => line !== '')).toEqual([
    `sysctl\t${sys}/fs/binfmt_misc/python\t<multiline> enabled interpreter /usr/bin/python3`,
    `sysctl\t${sys}/kernel/empty\t`,
    `sysctl\t${sys}/kernel/modprobe\t/sbin/modprobe`,
    `sysctl\t${sys}/kernel/printk\t4 4 1 7`,
    `sysctl\t${sys}/vm/secret\t28`,
  ]);
});

test.skipIf(OFF_LINUX)(
  'procfs records key each entry as a /proc path, without the process directories and the namespace views',
  async () => {
    await using directory = await temporaryDirectory('emulator-proc');
    await writeTree(directory.path, {
      'proc/sysrq-trigger': '',
      'proc/pressure/memory': '',
      'proc/1234/status': '',
      'proc/self/status': '',
      'proc/sys/kernel/sysrq': '',
      'proc/net/dev': '',
      'tracked.tsv': '',
    });
    await chmod(join(directory.path, 'proc/sysrq-trigger'), 0o200);
    await chmod(join(directory.path, 'proc/pressure'), 0o755);
    await chmod(join(directory.path, 'proc/pressure/memory'), 0o644);
    const output = await library(directory.path, 'proc_records "$DIRECTORY/proc" | sort');
    const uid = String(process.getuid?.() ?? 0);
    const gid = String(process.getgid?.() ?? 0);
    expect(output.split('\n').filter((line) => line !== '')).toEqual([
      `procattr\t/proc/pressure\t755 ${uid} ${gid}`,
      `procattr\t/proc/pressure/memory\t644 ${uid} ${gid}`,
      `procattr\t/proc/sysrq-trigger\t200 ${uid} ${gid}`,
    ]);
  },
);

test.skipIf(process.getuid?.() === 0)('every command of the guard refuses a user that is not root', async () => {
  await using directory = await temporaryDirectory('emulator-root');
  await writeFile(join(directory.path, 'tracked.tsv'), '');
  const result = await run('dash', ['-c', `. "$1"\nMODE=arm\nrequire_root`, 'dash', LIBRARY], {
    cwd: directory.path,
    successCodes: [0, 1],
    timeoutMs: TIMEOUT_MS,
  });
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString('utf8')).toContain('arm: root only');
});

test('residue is every entry whose value differs from its clean row, with the value to give it back', async () => {
  await using directory = await temporaryDirectory('emulator-residue');
  await writeTree(directory.path, {
    'tracked.tsv': records([
      ['clean', 'procattr', '/proc/sysrq-trigger', '200 0 0'],
      ['clean', 'tracefs-instance', 'bootreceiver', '<absent>'],
      ['clean', 'sysctl', '/proc/sys/vm/mmap_min_addr', '65536'],
      ['clean', 'sysctl', '/proc/sys/kernel/modprobe', '/sbin/modprobe'],
      ['clean', 'sysfsattr', '/sys/power/wakeup_count', '644 0 0'],
    ]),
    'snapshot.tsv': records([
      ['procattr', '/proc/sysrq-trigger', '220 0 1000'],
      ['sysctl', '/proc/sys/kernel/modprobe', ''],
      ['sysctl', '/proc/sys/vm/mmap_min_addr', '65536'],
      ['tracefs-instance', 'bootreceiver', 'present'],
    ]),
  });
  const US = '\u001F';
  // /sys/power/wakeup_count is missing from the snapshot and absent from the residue: a host that does not have an
  // entry never held a write of Android on it. An instance is the other way round, absence being its clean value.
  expect(await library(directory.path, 'residue "$DIRECTORY/snapshot.tsv"')).toBe(
    [
      ['procattr', '/proc/sysrq-trigger', '220 0 1000', '200 0 0'],
      ['sysctl', '/proc/sys/kernel/modprobe', '', '/sbin/modprobe'],
      ['tracefs-instance', 'bootreceiver', 'present', '<absent>'],
    ]
      .map((row) => `${row.join(US)}\n`)
      .join(''),
  );
});

test.skipIf(OFF_LINUX)(
  'mount records read the options of the visible debugfs and tracefs filesystems and their mount points',
  async () => {
    await using directory = await temporaryDirectory('emulator-mounts');
    await mkdir(join(directory.path, 'debug'));
    await mkdir(join(directory.path, 'tracing'), { mode: 0o700 });
    await chmod(join(directory.path, 'debug'), 0o755);
    await chmod(join(directory.path, 'tracing'), 0o700);
    const debug = join(directory.path, 'debug');
    const tracing = join(directory.path, 'tracing');
    await writeFile(
      join(directory.path, 'mountinfo'),
      [
        `37 24 0:8 / ${debug} rw,nosuid,nodev,noexec,relatime shared:14 - debugfs debugfs rw,mode=755`,
        `40 24 0:13 / ${tracing} rw,nosuid shared:16 - tracefs tracefs rw`,
        `41 24 0:13 / ${tracing} rw,nosuid - tracefs tracefs rw,gid=3012`,
        '',
      ].join('\n'),
    );
    await writeFile(join(directory.path, 'tracked.tsv'), '');
    const output = await library(
      directory.path,
      'DEBUGFS=$DIRECTORY/debug\nTRACEFS=$DIRECTORY/tracing\nMOUNTINFO=$DIRECTORY/mountinfo\nmount_records | sort',
    );
    const uid = String(process.getuid?.() ?? 0);
    const gid = String(process.getgid?.() ?? 0);
    expect(output.split('\n').filter((line) => line !== '')).toEqual([
      `mountroot\t${debug}\t755 ${uid} ${gid}`,
      `mountroot\t${tracing}\t700 ${uid} ${gid}`,
      `superopts\t${debug}\trw,mode=755`,
      `superopts\t${tracing}\trw,gid=3012`,
    ]);
  },
);

test('a remount gives back the uid, gid and mode the reference recorded, root and 0700 by default', async () => {
  await using directory = await temporaryDirectory('emulator-remount');
  expect(await library(directory.path, 'remount_options rw')).toBe('uid=0,gid=0,mode=700\n');
  expect(await library(directory.path, 'remount_options rw,gid=3012,mode=750')).toBe('uid=0,gid=3012,mode=750\n');
});
