/**
 * The kinds of records a snapshot of the root guard holds, one reader each in `root/lib.sh`:
 * `sysctl` a value under /proc/sys · `procattr` owner, group and mode of a /proc entry, through a fresh procfs ·
 * `sysfsattr` those of a listed sysfs path · `sysfsval` the value of a listed sysfs file ·
 * `superopts` the options of the debugfs or tracefs filesystem ·
 * `mountroot` owner, group and mode of their mount point · `tracefsattr` those of a tracefs entry ·
 * `tracefs-instance` an instance of tracefs · `tracefsval` the value of a listed tracefs file.
 */
export const SNAPSHOT_KINDS = [
  'sysctl',
  'procattr',
  'sysfsattr',
  'sysfsval',
  'superopts',
  'mountroot',
  'tracefsattr',
  'tracefs-instance',
  'tracefsval',
] as const;

export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];
