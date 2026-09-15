import { repoPath } from '@huma/kit/paths';
import { keysOf } from '@huma/kit/records';
import { SNAPSHOT_KINDS } from './kinds.ts';
import { guardLockWaitSeconds, guardRunTimeoutSeconds } from './timing.ts';
import {
  ANDROID_WILDCARDS,
  ANDROID_WRITES,
  MINIMUM_RECORDS,
  SKIPPED_SYSCTLS,
  VOLATILE_SYSCTLS,
} from '../android-writes.ts';
import type { EmulatorConfig } from '../config.ts';
import { ROOT_SOURCE } from '../sources.ts';

/** The table the root guard reads, generated from the configuration and from what Android writes. */
export const TRACKED_TABLE = repoPath(`${ROOT_SOURCE}/tracked.tsv`);

/**
 * `root/tracked.tsv`: one tab-separated row per line. `setting NAME VALUE` a setting of the guard · `minimum KIND COUNT`
 * the records a snapshot needs of a kind · `android KIND KEY VALUE` a write of Android, `KEY` being `*` for every entry
 * of a kind · `clean KIND KEY VALUE` the value arming requires and repair gives back · `volatile` and `skip` sysctls a
 * difference of is ignored or that are never read.
 */
export function renderTrackedTable(config: EmulatorConfig): string {
  const rows: readonly (readonly string[])[] = [
    ['setting', 'container', config.container],
    ['setting', 'unit', config.guard.unit],
    ['setting', 'tick_s', String(config.guard.tickSeconds)],
    ['setting', 'run_timeout_s', String(guardRunTimeoutSeconds(config))],
    ['setting', 'lock_wait_s', String(guardLockWaitSeconds(config))],
    ['setting', 'boot_deadline_s', String(config.guard.bootDeadlineSeconds)],
    ['setting', 'boot_wait_s', String(config.guard.bootWaitSeconds)],
    ['setting', 'apply_order', SNAPSHOT_KINDS.join(' ')],
    ...keysOf(MINIMUM_RECORDS).map((kind) => ['minimum', kind, String(MINIMUM_RECORDS[kind])]),
    ...ANDROID_WILDCARDS.map((wildcard) => ['android', wildcard.kind, '*', wildcard.android]),
    ...ANDROID_WRITES.map((write) => ['android', write.kind, write.key, write.android]),
    ...ANDROID_WRITES.map((write) => ['clean', write.kind, write.key, write.clean]),
    ...VOLATILE_SYSCTLS.map((key) => ['volatile', 'sysctl', key]),
    ...SKIPPED_SYSCTLS.map((key) => ['skip', 'sysctl', key]),
  ];
  const header = '# Généré par pnpm gen depuis tools/emulator/src/android-writes.ts et config.ts : ne pas modifier.';
  return `${[header, ...rows.map((row) => row.join('\t'))].join('\n')}\n`;
}
