import { isOneOf } from '@huma/kit/records';

/**
 * The status file the root guard publishes after each of its runs, the only thing it tells the rest of the machine.
 * Written by `root/lib.sh`, one tab-separated record per line; this module is its reader.
 */

export const STATUS_FORMAT = 'humanite-redroid-status/1';

/**
 * `armed`: reference taken, no container yet · `booting`: Android is booting, nothing restored yet · `restored`: the
 * running container's changes are reverted · `idle`: no container, the reference follows the host · `closed`: the
 * guard stopped its timer.
 */
export const GUARD_PHASES = ['armed', 'booting', 'restored', 'idle', 'closed'] as const;

type GuardPhase = (typeof GUARD_PHASES)[number];

/**
 * What a run did: `arm` took the reference · `wait` found Android booting · `boot` restored the host for the first time
 * since the container started, `tick` again · `stop` restored it once the container was gone · `idle` found no
 * container and followed the host · `close` stopped the timer.
 */
export const GUARD_MODES = ['arm', 'wait', 'boot', 'tick', 'stop', 'idle', 'close'] as const;

export type GuardMode = (typeof GUARD_MODES)[number];

/**
 * How a run classified a difference between the reference and the host: `revert` a change Android is known to make,
 * written back · `revert-unknown` a change nothing attributes to Android, written back all the same · `pending` a
 * tracefs instance of Android, removed once the container stops · `keep-unknown` an instance nothing attributes to
 * Android, kept · `unrevertable` a value the guard cannot write back · `accept` a change while no container runs,
 * which the reference follows.
 */
export const GUARD_ACTIONS = ['revert', 'revert-unknown', 'pending', 'keep-unknown', 'unrevertable', 'accept'] as const;

export type GuardAction = (typeof GUARD_ACTIONS)[number];

/** Why a run failed; the guard keeps every failure until the next arm. */
export const GUARD_FAILURES = [
  'capture-failed',
  'residue',
  'unattributed',
  'unwritable-value',
  'write-failed',
  'not-restored',
  'scripts-changed',
] as const;

export type GuardFailure = (typeof GUARD_FAILURES)[number];

/** A difference a run found, and what it did about it. */
type GuardChange = Readonly<{ action: GuardAction; kind: string; key: string; was: string; is: string }>;

export type GuardStatus = Readonly<{
  bootId: string;
  armedAt: number;
  phase: GuardPhase;
  mode: GuardMode;
  /** The container as the run last saw it: its docker status, or `absent`, and when it started. */
  container: Readonly<{ status: string; startedAt: string | null }>;
  /** When the container the host was last restored for started; `null` once none runs. */
  restoredStartedAt: string | null;
  /** End of the run, in seconds since the epoch. */
  runEnd: number;
  /** SHA-256 of each installed file, recorded when the guard was armed. */
  scripts: ReadonlyMap<string, string>;
  changes: readonly GuardChange[];
  /** Differences still found by the second snapshot of the run, once written. */
  remaining: readonly GuardChange[];
  failures: readonly Readonly<{ at: number; mode: GuardMode; reason: GuardFailure; detail: string }>[];
}>;

/** The value written for a field the run has nothing for. */
const NONE = '-';

const optional = (value: string): string | null => (value === NONE ? null : value);

const seconds = (value: string, field: string): number => {
  if (!/^\d+$/u.test(value)) {
    throw new Error(`statut du garde : ${field} « ${value} » n’est pas un nombre de secondes`);
  }
  return Number(value);
};

function oneOf<const Value extends string>(values: readonly Value[], value: string, field: string): Value {
  if (!isOneOf(values, value)) {
    throw new Error(`statut du garde : ${field} « ${value} » inconnu`);
  }
  return value;
}

function change(fields: readonly string[]): GuardChange {
  const [action = '', kind, key, was, is] = fields;
  if (kind === undefined || key === undefined || was === undefined || is === undefined) {
    throw new Error(`statut du garde : écart incomplet : ${fields.join(' ')}`);
  }
  return { action: oneOf(GUARD_ACTIONS, action, 'action'), kind, key, was, is };
}

/** The status the guard published; a file in another format, or incomplete, is an error, never a guess. */
export function parseGuardStatus(text: string): GuardStatus {
  const single = new Map<string, readonly string[]>();
  const scripts = new Map<string, string>();
  const changes: GuardChange[] = [];
  const remaining: GuardChange[] = [];
  const failures: GuardStatus['failures'][number][] = [];
  for (const line of text.split('\n').filter((candidate) => candidate !== '')) {
    const [field = '', ...values] = line.split('\t');
    switch (field) {
      case 'script': {
        const [file, hash] = values;
        if (file === undefined || hash === undefined) {
          throw new Error(`statut du garde : empreinte incomplète : ${line}`);
        }
        scripts.set(file, hash);
        break;
      }
      case 'change':
        changes.push(change(values));
        break;
      case 'remaining':
        remaining.push(change(values));
        break;
      case 'failure': {
        const [at = '', mode = '', reason = '', ...detail] = values;
        failures.push({
          at: seconds(at, 'échec'),
          mode: oneOf(GUARD_MODES, mode, 'mode'),
          reason: oneOf(GUARD_FAILURES, reason, 'échec'),
          detail: detail.join(' '),
        });
        break;
      }
      default:
        single.set(field, values);
    }
  }
  const value = (field: string, index = 0): string => {
    const found = single.get(field)?.[index];
    if (found === undefined) {
      throw new Error(`statut du garde : champ ${field} absent`);
    }
    return found;
  };
  if (value('format') !== STATUS_FORMAT) {
    throw new Error(`statut du garde : format ${value('format')}, attendu ${STATUS_FORMAT}`);
  }
  return {
    bootId: value('boot_id'),
    armedAt: seconds(value('armed_at'), 'armed_at'),
    phase: oneOf(GUARD_PHASES, value('phase'), 'phase'),
    mode: oneOf(GUARD_MODES, value('mode'), 'mode'),
    container: { status: value('container'), startedAt: optional(value('container', 1)) },
    restoredStartedAt: optional(value('restored_started_at')),
    runEnd: seconds(value('run_end'), 'run_end'),
    scripts,
    changes,
    remaining,
    failures,
  };
}
