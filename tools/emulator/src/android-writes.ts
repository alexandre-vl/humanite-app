import type { SnapshotKind } from './guard/kinds.ts';

/**
 * What Android writes on the host kernel when Redroid boots and runs, read in the image
 * (`humanite/redroid:15.0.0_64only-250627`, userdebug) and checked against this host on 2026-09-15. The root guard
 * reverts these writes without failing, fails on any other change during a session, and refuses to arm on a host that
 * still holds what an earlier session left; `root/tracked.tsv` is generated from this file.
 *
 * Not listed, since they cannot reach the host: the `net` sysctls, the hostname and the IPC sysctls, each in a
 * namespace of the container; device nodes and cgroups, in its own devtmpfs and cgroup namespace; the sysfs paths of
 * hardware this host lacks; and the writes whose trigger this image never fires (`kernel.pid_max` for a 32-bit
 * zygote, the dirty page sysctls of low-RAM devices).
 */

export type AndroidWrite = Readonly<{
  kind: SnapshotKind;
  /** The entry, or `*` for every entry of the kind. */
  key: string;
  /** What Android writes; `*` when it depends on the kernel or on what Android does at run time. */
  android: string;
  /**
   * The value of a host no session has touched, which arming requires: anything else is what an earlier session left.
   * `null` for a value other tenants of the host may set as well.
   */
  clean: string | null;
  /** The file of the image and its line, or the binary, that writes it. */
  source: string;
}>;

/** How a snapshot records an entry that does not exist. */
export const ABSENT = '<absent>';

const INIT_RC = 'system/etc/init/hw/init.rc';

export const ANDROID_WRITES: readonly AndroidWrite[] = [
  // Sysctls: arming requires the clean value only of those no other tenant of this host sets.
  { kind: 'sysctl', key: '/proc/sys/kernel/sysrq', android: '0', clean: null, source: `${INIT_RC}:17` },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/modprobe',
    android: '',
    clean: '/sbin/modprobe',
    source: `${INIT_RC}:22`,
  },
  { kind: 'sysctl', key: '/proc/sys/kernel/panic_on_oops', android: '1', clean: null, source: `${INIT_RC}:274` },
  // 0 at init, then the timeout of llkd once khungtask is enabled.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_timeout_secs',
    android: '*',
    clean: '120',
    source: `${INIT_RC}:275, system/etc/init/llkd.rc:26`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_warnings',
    android: '65535',
    clean: '10',
    source: 'system/etc/init/llkd.rc:27',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_check_count',
    android: '65535',
    clean: '4194304',
    source: 'system/etc/init/llkd.rc:28',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_panic',
    android: '1',
    clean: '0',
    source: 'system/etc/init/llkd.rc:29',
  },
  { kind: 'sysctl', key: '/proc/sys/kernel/randomize_va_space', android: '2', clean: null, source: `${INIT_RC}:287` },
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/mmap_min_addr',
    android: '32768',
    clean: '65536',
    source: `${INIT_RC}:288`,
  },
  { kind: 'sysctl', key: '/proc/sys/vm/watermark_boost_factor', android: '0', clean: null, source: `${INIT_RC}:441` },
  { kind: 'sysctl', key: '/proc/sys/vm/overcommit_memory', android: '1', clean: null, source: `${INIT_RC}:1114` },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/sched_schedstats',
    android: '1',
    clean: null,
    source: 'system/etc/init/atrace.rc:10',
  },
  // -1 when the kernel exposes perf hooks to an LSM, 3 otherwise.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_event_paranoid',
    android: '*',
    clean: null,
    source: `${INIT_RC}:1255-1259`,
  },
  // The kernel also lowers it by itself when perf interrupts take too long.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_event_max_sample_rate',
    android: '*',
    clean: null,
    source: `${INIT_RC}:1269`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_cpu_time_max_percent',
    android: '25',
    clean: null,
    source: `${INIT_RC}:1270`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_event_mlock_kb',
    android: '516',
    clean: null,
    source: `${INIT_RC}:1271`,
  },
  // 2 from init, 0 or 2 again when a userdebug build lowers or raises it.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/kptr_restrict',
    android: '*',
    clean: null,
    source: `init (SetKptrRestrictAction), ${INIT_RC}:1276-1279`,
  },
  // The largest value the kernel accepts; Android's boot fails if the write does, so the guard waits for the boot.
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/mmap_rnd_bits',
    android: '*',
    clean: '28',
    source: 'init (SetMmapRndBitsAction)',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/mmap_rnd_compat_bits',
    android: '*',
    clean: '8',
    source: 'init (SetMmapRndBitsAction)',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/unprivileged_bpf_disabled',
    android: '2',
    clean: null,
    source: 'apex com.android.tethering: netbpfload',
  },
  // Written at run time by ActivityManager through extra_free_kbytes.sh.
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/watermark_scale_factor',
    android: '*',
    clean: null,
    source: `${INIT_RC}:1234`,
  },
  // /proc entries: procfs copies an owner or mode changed through any mount to the kernel-wide entry.
  {
    kind: 'procattr',
    key: '/proc/sysrq-trigger',
    android: '220 0 1000',
    clean: '200 0 0',
    source: `${INIT_RC}:582-583`,
  },
  {
    kind: 'procattr',
    key: '/proc/kmsg',
    android: '440 0 1000',
    clean: '400 0 0',
    source: `${INIT_RC}:580-581`,
  },
  {
    kind: 'procattr',
    key: '/proc/pressure/memory',
    android: '664 1000 1000',
    clean: '666 0 0',
    source: `${INIT_RC}:393-394`,
  },
  {
    kind: 'procattr',
    key: '/proc/slabinfo',
    android: '440 0 1007',
    clean: '400 0 0',
    source: `${INIT_RC}:573-574`,
  },
  {
    kind: 'procattr',
    key: '/proc/pagetypeinfo',
    android: '440 0 1007',
    clean: '400 0 0',
    source: `${INIT_RC}:576-577`,
  },
  {
    kind: 'procattr',
    key: '/proc/cmdline',
    android: '440 0 1001',
    clean: '444 0 0',
    source: `${INIT_RC}:1204, init`,
  },
  // Redroid mounts an empty file over it first (vendor/etc/init/redroid.common.rc:63): kept in case that ever races.
  {
    kind: 'procattr',
    key: '/proc/vmallocinfo',
    android: '440 0 1007',
    clean: '400 0 0',
    source: `${INIT_RC}:570-571`,
  },
  // sysfs: kernfs keeps one owner and mode per node for every mount.
  {
    kind: 'sysfsattr',
    key: '/sys/power/wakeup_count',
    android: '644 1000 1000',
    clean: '644 0 0',
    source: `${INIT_RC}:430`,
  },
  // Redroid mounts an empty file over it first (vendor/etc/init/redroid.common.rc:66).
  {
    kind: 'sysfsattr',
    key: '/sys/power/state',
    android: '660 1000 1000',
    clean: '644 0 0',
    source: `${INIT_RC}:429-431`,
  },
  {
    kind: 'sysfsattr',
    key: '/sys/firmware/acpi/tables',
    android: '755 1000 1000',
    clean: '755 0 0',
    source: `${INIT_RC}:1201`,
  },
  // Only when a device configuration flag is set, which nothing sets without Google services.
  {
    kind: 'sysfsval',
    key: '/sys/kernel/mm/lru_gen/enabled',
    android: '*',
    clean: null,
    source: `${INIT_RC}:1320-1329`,
  },
  // debugfs and tracefs: one filesystem each for the whole kernel, whatever mounts it.
  {
    kind: 'superopts',
    key: '/sys/kernel/debug',
    android: 'rw,mode=755',
    clean: 'rw',
    source: 'vendor/etc/init/redroid.common.rc:2',
  },
  {
    kind: 'superopts',
    key: '/sys/kernel/tracing',
    android: 'rw,gid=3012',
    clean: 'rw',
    source: `${INIT_RC}:78`,
  },
  {
    kind: 'mountroot',
    key: '/sys/kernel/debug',
    android: '755 0 0',
    clean: '700 0 0',
    source: 'system/etc/init/init-debug.rc:12',
  },
  {
    kind: 'mountroot',
    key: '/sys/kernel/tracing',
    android: '*',
    clean: '700 0 0',
    source: `${INIT_RC}:78`,
  },
  // atrace makes about 175 files readable and writable by all, kprobe_events and set_event included.
  {
    kind: 'tracefsattr',
    key: '*',
    android: '*',
    clean: null,
    source: 'system/etc/init/atrace.rc, atrace_userdebug.rc',
  },
  {
    kind: 'tracefsval',
    key: 'tracing_on',
    android: '0',
    clean: '1',
    source: 'system/etc/init/atrace.rc:316-317',
  },
  // Instances outlive the container: only rmdir removes them.
  {
    kind: 'tracefs-instance',
    key: 'bootreceiver',
    android: 'present',
    clean: ABSENT,
    source: `${INIT_RC}:640-644`,
  },
  {
    kind: 'tracefs-instance',
    key: 'wifi',
    android: 'present',
    clean: ABSENT,
    source: 'system/etc/init/wifi.rc:30-38',
  },
];

/** Sysctls the kernel changes on its own all the time: a difference is never a write. */
export const VOLATILE_SYSCTLS = ['/proc/sys/kernel/ns_last_pid'] as const;

/** Sysctls the guard never reads: reading `stat_refresh` makes the kernel refresh its counters. */
export const SKIPPED_SYSCTLS = ['/proc/sys/vm/stat_refresh'] as const;

/**
 * Fewer records of a kind than this means a reader saw nothing: the host has a few hundred sysctls, /proc entries and
 * tracefs entries, two debugfs and tracefs mounts, and the listed sysfs paths.
 */
export const MINIMUM_RECORDS: Readonly<Record<SnapshotKind, number>> = {
  sysctl: 100,
  procattr: 100,
  sysfsattr: 3,
  sysfsval: 1,
  superopts: 2,
  mountroot: 2,
  tracefsattr: 100,
  'tracefs-instance': 0,
  tracefsval: 1,
};
