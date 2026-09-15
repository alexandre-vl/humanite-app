/**
 * The kinds of records a snapshot of the root guard holds, one reader each in `root/lib.sh`:
 * `superopts` the options of the debugfs or tracefs filesystem · `mountroot` owner, group and mode of their mount
 * point · `sysctl` a value under /proc/sys · `procattr` owner, group and mode of a /proc entry, through a fresh
 * procfs · `sysfsattr` those of a listed sysfs path · `sysfsval` the value of a listed sysfs file ·
 * `tracefsattr` those of a tracefs entry · `tracefsval` the value of a listed tracefs file ·
 * `tracefs-instance` an instance of tracefs.
 *
 * They are written back in this order, which `tracked.tsv` carries to the guard: remounting debugfs or tracefs gives
 * its mount point the mode of the filesystem, so the mount point comes after it, and an instance goes away last, once
 * nothing reads the entries it holds any more.
 */
export const SNAPSHOT_KINDS = [
  'superopts',
  'mountroot',
  'sysctl',
  'procattr',
  'sysfsattr',
  'sysfsval',
  'tracefsattr',
  'tracefsval',
  'tracefs-instance',
] as const;

export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];
