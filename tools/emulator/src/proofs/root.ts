import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FileTree } from '@huma/fixtures';
import { fixtureFactory, writeTree } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import { run } from '@huma/kit/process';
import { isOneOf } from '@huma/kit/records';
import type { GuardCode } from '../checks.ts';
import type { GuardMode, GuardStatus } from '../guard/status.ts';
import { GUARD_ACTIONS, parseGuardStatus } from '../guard/status.ts';

/**
 * Fixtures of the root guard: `root/lib.sh` of the repository runs in dash, as root runs it, with its directories moved
 * into a temporary one and the functions that read or write the kernel replaced, so that its decisions and its status
 * are proven without root.
 */

const define = fixtureFactory<GuardCode>();

/** The library as the repository holds it. */
export const LIBRARY = fileURLToPath(new URL('../../root/lib.sh', import.meta.url));

/** The unit separator between the fields of a plan. */
const US = '\u001f';

type Row = readonly string[];

/** Tab-separated records, one per line. */
export const records = (rows: readonly Row[]): string => rows.map((row) => `${row.join('\t')}\n`).join('');

/** A table in which Android writes a sysctl, the attributes of a /proc entry, a tracefs instance and any tracefs mode. */
const TRACKED: readonly Row[] = [
  ['setting', 'container', 'redroid-fixture'],
  ['setting', 'unit', 'redroid-fixture-guard'],
  ['setting', 'tick_s', '30'],
  ['setting', 'run_timeout_s', '120'],
  ['setting', 'boot_deadline_s', '180'],
  ['setting', 'boot_wait_s', '60'],
  ['setting', 'idle_ttl_s', '14400'],
  ['android', 'sysctl', '/proc/sys/kernel/kptr_restrict', '2'],
  ['android', 'sysctl', '/proc/sys/kernel/modprobe', ''],
  ['android', 'procattr', '/proc/sysrq-trigger', '220 0 1000'],
  ['android', 'tracefs-instance', 'bootreceiver', 'present'],
  ['android', 'tracefsattr', '*', '*'],
  ['clean', 'procattr', '/proc/sysrq-trigger', '200 0 0'],
  ['volatile', 'sysctl', '/proc/sys/kernel/ns_last_pid'],
];

/** The host before any session: every record the fixtures change, at its value without Android. */
const CLEAN: readonly Row[] = [
  ['procattr', '/proc/sysrq-trigger', '200 0 0'],
  ['sysctl', '/proc/sys/kernel/kptr_restrict', '0'],
  ['sysctl', '/proc/sys/kernel/modprobe', '/sbin/modprobe'],
  ['sysctl', '/proc/sys/kernel/ns_last_pid', '1000'],
  ['sysctl', '/proc/sys/vm/swappiness', '60'],
  ['tracefsattr', '/sys/kernel/tracing/tracing_on', '640 0 0'],
];

/** `CLEAN` with the value of `kind` and `key` replaced, or added; `null` removes the record. */
function withRecord(host: readonly Row[], kind: string, key: string, value: string | null): readonly Row[] {
  const others = host.filter(([otherKind, otherKey]) => otherKind !== kind || otherKey !== key);
  return value === null ? others : [...others, [kind, key, value]];
}

/** Runs `body` in dash with the library sourced and its paths moved into `directory`; resolves standard output. */
async function dash(directory: string, body: string, signal: AbortSignal): Promise<string> {
  const script = [
    'set -eu',
    '. "$1"',
    'DIRECTORY=$2',
    'LIB=$DIRECTORY/lib',
    'TRACKED=$LIB/tracked.tsv',
    'RUN=$DIRECTORY/run',
    'STATE=$RUN/state',
    'BOOT_ID=$DIRECTORY/boot_id',
    'PATH=$DIRECTORY/bin:$PATH',
    body,
  ].join('\n');
  const { stdout } = await run('dash', ['-c', script, 'dash', LIBRARY, directory], {
    cwd: directory,
    signal,
    successCodes: [0, 1],
  });
  return stdout.toString('utf8');
}

/** The actions of a plan printed by the library, as codes. */
const planCodes = (output: string): readonly GuardCode[] =>
  output
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [action = ''] = line.split(US);
      if (!isOneOf(GUARD_ACTIONS, action)) {
        throw new Error(`plan : action inconnue dans ${JSON.stringify(line)}`);
      }
      return `root/${action}` as const;
    });

/** What `plan MODE` decides between a reference and a snapshot, as codes. */
const planned =
  (mode: GuardMode, reference: readonly Row[], now: readonly Row[]) =>
  async ({ signal }: Readonly<{ signal: AbortSignal }>): Promise<readonly GuardCode[]> => {
    await using directory = await temporaryDirectory('emulator-plan');
    await writeTree(directory.path, {
      'lib/tracked.tsv': records(TRACKED),
      'reference.tsv': records(reference),
      'now.tsv': records(now),
    });
    return planCodes(
      await dash(directory.path, `plan ${mode} "$DIRECTORY/reference.tsv" "$DIRECTORY/now.tsv"`, signal),
    );
  };

const android = (host: readonly Row[]): readonly Row[] =>
  withRecord(host, 'sysctl', '/proc/sys/kernel/kptr_restrict', '2');

const PLAN_FIXTURES = [
  define(
    'root/plan-known-sysctl',
    'Android écrit sa valeur dans un sysctl pendant la session : écriture annulée',
    ['root/revert'],
    planned('boot', CLEAN, android(CLEAN)),
  ),
  define(
    'root/plan-known-attributes',
    'Android change propriétaire, groupe et mode d’une entrée de /proc : écriture annulée',
    ['root/revert'],
    planned('tick', CLEAN, withRecord(CLEAN, 'procattr', '/proc/sysrq-trigger', '220 0 1000')),
  ),
  define(
    'root/plan-any-tracefs-mode',
    'une entrée tracefs change de mode : toute la table tracefs est attribuée à Android',
    ['root/revert'],
    planned('boot', CLEAN, withRecord(CLEAN, 'tracefsattr', '/sys/kernel/tracing/tracing_on', '664 0 3012')),
  ),
  define(
    'root/plan-other-value',
    'un sysctl d’Android prend une autre valeur que la sienne pendant la session : écart non attribué',
    ['root/revert-unknown'],
    planned('boot', CLEAN, withRecord(CLEAN, 'sysctl', '/proc/sys/kernel/kptr_restrict', '1')),
  ),
  define(
    'root/plan-unknown-sysctl',
    'un sysctl qu’Android n’écrit pas change pendant la session : écart non attribué, annulé',
    ['root/revert-unknown'],
    planned('stop', CLEAN, withRecord(CLEAN, 'sysctl', '/proc/sys/vm/swappiness', '10')),
  ),
  define(
    'root/plan-instance-running',
    'Android crée son instance tracefs pendant que le conteneur tourne : retirée à l’arrêt',
    ['root/pending'],
    planned('tick', CLEAN, withRecord(CLEAN, 'tracefs-instance', 'bootreceiver', 'present')),
  ),
  define(
    'root/plan-instance-stopped',
    'l’instance tracefs d’Android reste après l’arrêt du conteneur : retirée',
    ['root/revert'],
    planned('stop', CLEAN, withRecord(CLEAN, 'tracefs-instance', 'bootreceiver', 'present')),
  ),
  define(
    'root/plan-unknown-instance',
    'une instance tracefs inconnue apparaît pendant la session : gardée, écart non attribué',
    ['root/keep-unknown'],
    planned('boot', CLEAN, withRecord(CLEAN, 'tracefs-instance', 'perf-tenant', 'present')),
  ),
  define(
    'root/plan-idle-neighbor',
    'hors session, un sysctl qu’Android n’écrit pas change : la référence le suit',
    ['root/accept'],
    planned('idle', CLEAN, withRecord(CLEAN, 'sysctl', '/proc/sys/vm/swappiness', '10')),
  ),
  define(
    'root/plan-idle-android',
    'hors session, la valeur d’Android apparaît dans un sysctl : écriture annulée, jamais reprise',
    ['root/revert'],
    planned('idle', CLEAN, android(CLEAN)),
  ),
  define(
    'root/plan-appeared-entry',
    'un sysctl apparaît avec un module chargé : rien à réécrire',
    ['root/accept'],
    planned('boot', CLEAN, withRecord(CLEAN, 'sysctl', '/proc/sys/fs/nfs/nlm_tcpport', '0')),
  ),
  define(
    'root/plan-volatile',
    'seul change un sysctl que le noyau change sans cesse : aucun écart',
    [],
    planned('boot', CLEAN, withRecord(CLEAN, 'sysctl', '/proc/sys/kernel/ns_last_pid', '2345')),
  ),
  define(
    'root/plan-multiline',
    'une valeur sur plusieurs lignes change pendant la session : impossible à réécrire',
    ['root/unrevertable'],
    planned(
      'boot',
      withRecord(CLEAN, 'sysctl', '/proc/sys/fs/binfmt_misc/python3', '<multiline> enabled a'),
      withRecord(CLEAN, 'sysctl', '/proc/sys/fs/binfmt_misc/python3', '<multiline> enabled b'),
    ),
  ),
] as const;

/** The files a guard fixture starts from: the installed library files, a boot id and the fake system commands. */
const INSTALLED: FileTree = {
  'lib/tracked.tsv': records(TRACKED),
  'lib/arm.sh': 'arm\n',
  'lib/guard.sh': 'guard\n',
  'lib/disarm.sh': 'disarm\n',
  'lib/lib.sh': 'lib\n',
  boot_id: 'c782471d-2ec0-48ae-af2b-d25ccc4cf445\n',
  'bin/systemctl': {
    content: '#!/bin/sh\ncase $1 in is-active) [ -f "$DIRECTORY/timer-active" ] ;; *) exit 0 ;; esac\n',
    mode: 0o755,
  },
  'bin/systemd-run': { content: '#!/bin/sh\n: >"$DIRECTORY/timer-active"\n', mode: 0o755 },
};

/**
 * Replaces the kernel and docker readers of the library: `snapshot` copies the next file of `snapshots/`, the container
 * is what `container` holds, Android has booted, and each write is logged to `writes`, failing when `writes-fail`
 * exists.
 */
const FAKES = String.raw`
export DIRECTORY
snapshot() {
  count=$(($(cat "$DIRECTORY/snapshot-count" 2>/dev/null || echo 0) + 1))
  printf '%s\n' "$count" >"$DIRECTORY/snapshot-count"
  [ -f "$DIRECTORY/snapshots/$count.tsv" ] && cp "$DIRECTORY/snapshots/$count.tsv" "$1"
}
container_state() {
  read -r CONTAINER_STATUS STARTED_AT <"$DIRECTORY/container"
  if [ "$STARTED_AT" = - ]; then STARTED_AT=; fi
}
booted() { true; }
revert_one() {
  printf '%s|%s|%s\n' "$1" "$2" "$3" >>"$DIRECTORY/writes"
  [ ! -f "$DIRECTORY/writes-fail" ]
}
`;

/** One command of a guard fixture: its script, run in its own dash, the container it sees and a file to change. */
type GuardCommand = Readonly<{
  command: 'arm_run' | 'guard_run' | 'disarm_run';
  container: 'absent' | 'running' | 'exited';
  before?: (directory: string) => Promise<void>;
}>;

const STARTED_AT = '2026-09-15T08:00:00.000000000Z';

/** What a guard fixture left: the status the library published, its directory and the writes it logged. */
type Scenario = AsyncDisposable & Readonly<{ status: GuardStatus; directory: string; writes: string }>;

/** Runs `commands` in turn on the snapshots given, then reads the status the library published. */
async function guardScenario(
  signal: AbortSignal,
  snapshots: readonly (readonly Row[])[],
  commands: readonly GuardCommand[],
  extra: FileTree = {},
): Promise<Scenario> {
  const directory = await temporaryDirectory('emulator-guard');
  await writeTree(directory.path, {
    ...INSTALLED,
    ...Object.fromEntries(
      snapshots.map((snapshot, index) => [`snapshots/${String(index + 1)}.tsv`, records(snapshot)]),
    ),
    ...extra,
  });
  for (const step of commands) {
    await writeFile(
      join(directory.path, 'container'),
      `${step.container} ${step.container === 'absent' ? '-' : STARTED_AT}\n`,
    );
    await step.before?.(directory.path);
    await dash(directory.path, `${FAKES}\n(${step.command}) || true`, signal);
  }
  const status = parseGuardStatus(await readFile(join(directory.path, 'run/status'), 'utf8'));
  const writes = await readFile(join(directory.path, 'writes'), 'utf8').catch(() => '');
  return { status, directory: directory.path, writes, [Symbol.asyncDispose]: directory[Symbol.asyncDispose] };
}

/** The codes of a status: the action of each change, then the reason of each failure. */
const statusCodes = (status: GuardStatus): readonly GuardCode[] => [
  ...status.changes.map((change) => `root/${change.action}` as const),
  ...status.failures.map((failure) => `root/${failure.reason}` as const),
];

/** Fails the fixture with `message` unless `condition` holds. */
function expectThat(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const ARM: GuardCommand = { command: 'arm_run', container: 'absent' };

const RUNNING: GuardCommand = { command: 'guard_run', container: 'running' };

const GUARD_FIXTURES = [
  define(
    'root/run-boot-restored',
    'Android écrit un sysctl connu au démarrage : le passage le réécrit, publie restored et retient le démarrage',
    ['root/revert'],
    async ({ signal }) => {
      await using scenario = await guardScenario(signal, [CLEAN, android(CLEAN), CLEAN], [ARM, RUNNING]);
      expectThat(scenario.status.phase === 'restored' && scenario.status.mode === 'boot', 'phase restored attendue');
      expectThat(scenario.status.restoredStartedAt === STARTED_AT, 'démarrage restauré non retenu');
      expectThat(scenario.writes === 'sysctl|/proc/sys/kernel/kptr_restrict|0\n', `réécritures : ${scenario.writes}`);
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-empty-values',
    'une valeur vide passe intacte du plan à la réécriture, dans les deux sens',
    ['root/revert', 'root/revert-unknown', 'root/unattributed'],
    async ({ signal }) => {
      const reference = withRecord(CLEAN, 'sysctl', '/proc/sys/kernel/hostname', '');
      const now = withRecord(
        withRecord(reference, 'sysctl', '/proc/sys/kernel/modprobe', ''),
        'sysctl',
        '/proc/sys/kernel/hostname',
        'redroid',
      );
      await using scenario = await guardScenario(signal, [reference, now, reference], [ARM, RUNNING]);
      const expected = 'sysctl|/proc/sys/kernel/modprobe|/sbin/modprobe\nsysctl|/proc/sys/kernel/hostname|\n';
      expectThat(scenario.writes === expected, `réécritures : ${JSON.stringify(scenario.writes)}`);
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-write-failed',
    'une réécriture échoue : le passage échoue et le second instantané trouve encore l’écart',
    ['root/revert', 'root/write-failed', 'root/not-restored'],
    async ({ signal }) => {
      await using scenario = await guardScenario(signal, [CLEAN, android(CLEAN), android(CLEAN)], [ARM, RUNNING], {
        'writes-fail': '',
      });
      expectThat(scenario.status.restoredStartedAt === null, 'un passage en échec ne retient pas le démarrage');
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-capture-failed',
    'un lecteur de l’hôte échoue pendant le passage : instantané incomplet',
    ['root/capture-failed'],
    async ({ signal }) => {
      await using scenario = await guardScenario(signal, [CLEAN], [ARM, RUNNING]);
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-unwritable',
    'une valeur sur plusieurs lignes change pendant la session : le passage échoue sans l’écrire',
    ['root/unrevertable', 'root/unwritable-value'],
    async ({ signal }) => {
      const before = withRecord(CLEAN, 'sysctl', '/proc/sys/fs/binfmt_misc/arm64', '<multiline> enabled a');
      const after = withRecord(CLEAN, 'sysctl', '/proc/sys/fs/binfmt_misc/arm64', '<multiline> enabled b');
      await using scenario = await guardScenario(signal, [before, after, after], [ARM, RUNNING]);
      expectThat(scenario.writes === '', `aucune réécriture attendue : ${scenario.writes}`);
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-scripts-changed',
    'un fichier installé change après l’armement : le passage échoue avant de lire l’hôte',
    ['root/scripts-changed'],
    async ({ signal }) => {
      const changeLibrary: GuardCommand = {
        ...RUNNING,
        before: async (directory) => writeFile(join(directory, 'lib/lib.sh'), 'lib changed\n'),
      };
      await using scenario = await guardScenario(signal, [CLEAN, android(CLEAN), CLEAN], [ARM, changeLibrary]);
      expectThat(scenario.writes === '', `aucune réécriture attendue : ${scenario.writes}`);
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/arm-residue',
    'l’hôte garde les attributs d’Android sur /proc à l’armement : armement refusé, minuteur jamais lancé',
    ['root/residue'],
    async ({ signal }) => {
      const residue = withRecord(CLEAN, 'procattr', '/proc/sysrq-trigger', '220 0 1000');
      await using scenario = await guardScenario(signal, [residue], [ARM]);
      const timer = await readFile(join(scenario.directory, 'timer-active')).then(
        () => true,
        () => false,
      );
      expectThat(!timer, 'le minuteur ne démarre pas sur un hôte à résidus');
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-stop-instance',
    'le conteneur supprimé laisse l’instance tracefs d’Android : retirée, la session close et la référence reprise',
    ['root/revert'],
    async ({ signal }) => {
      const instance = withRecord(CLEAN, 'tracefs-instance', 'bootreceiver', 'present');
      const stopped: GuardCommand = { command: 'guard_run', container: 'absent' };
      await using scenario = await guardScenario(
        signal,
        [CLEAN, instance, instance, instance, CLEAN],
        [ARM, RUNNING, stopped],
      );
      expectThat(
        scenario.status.phase === 'idle' && scenario.status.mode === 'stop',
        'phase idle en mode stop attendue',
      );
      expectThat(scenario.status.restoredStartedAt === null, 'la session doit être close');
      expectThat(
        scenario.writes === 'tracefs-instance|bootreceiver|<absent>\n',
        `réécritures : ${JSON.stringify(scenario.writes)}`,
      );
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-idle-follows',
    'hors session, un voisin change un sysctl : la référence le reprend, et le passage suivant ne voit plus d’écart',
    [],
    async ({ signal }) => {
      const neighbor = withRecord(CLEAN, 'sysctl', '/proc/sys/vm/swappiness', '10');
      const idle: GuardCommand = { command: 'guard_run', container: 'absent' };
      await using scenario = await guardScenario(
        signal,
        [CLEAN, neighbor, neighbor, neighbor, neighbor],
        [ARM, idle, idle],
      );
      const reference = await readFile(join(scenario.directory, 'run/state/reference.tsv'), 'utf8');
      expectThat(reference.includes('/proc/sys/vm/swappiness\t10'), 'la référence doit suivre le voisin');
      expectThat(scenario.status.phase === 'idle' && scenario.status.mode === 'idle', 'phase idle attendue');
      return statusCodes(scenario.status);
    },
  ),
  define(
    'root/run-idle-neighbor',
    'hors session, le passage qui voit un voisin changer un sysctl le reprend sans échouer',
    ['root/accept'],
    async ({ signal }) => {
      const neighbor = withRecord(CLEAN, 'sysctl', '/proc/sys/vm/swappiness', '10');
      const idle: GuardCommand = { command: 'guard_run', container: 'absent' };
      await using scenario = await guardScenario(signal, [CLEAN, neighbor, neighbor], [ARM, idle]);
      return statusCodes(scenario.status);
    },
  ),
] as const;

export const ROOT_FIXTURES = [...PLAN_FIXTURES, ...GUARD_FIXTURES] as const;
