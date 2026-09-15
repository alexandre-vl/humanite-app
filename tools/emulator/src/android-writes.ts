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
  key: string;
  /** What Android writes; `*` when it depends on the kernel or on what Android does at run time. */
  android: string;
  /**
   * The value of a host no session has touched: arming requires it, `arm.sh --repair` gives it back, and out of a
   * session the guard writes it back rather than follow it.
   */
  clean: string;
  /** Where a clean host gets that value, shown by `emulator:status` next to what it expects. */
  cleanFrom: string;
  /** The file of the image and its line, or the binary, that writes it. */
  source: string;
}>;

/**
 * A kind whose entries Android changes by the hundred, which the table does not name one by one: the reference the
 * guard takes when it arms holds their clean values, and any change of one of them is a write of Android.
 */
export type AndroidWildcard = Readonly<{ kind: SnapshotKind; android: string; source: string }>;

/** How a snapshot records an entry that does not exist. */
export const ABSENT = '<absent>';

const INIT_RC = 'system/etc/init/hw/init.rc';

const KERNEL = 'défaut du noyau 6.12';

const NO_INSTANCE = 'le noyau ne crée aucune instance de tracefs';

const config = (option: string): string => `${option} de /boot/config-6.12`;

export const ANDROID_WRITES: readonly AndroidWrite[] = [
  // Sysctls.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/sysrq',
    android: '0',
    clean: '438',
    cleanFrom: '/usr/lib/sysctl.d/50-default.conf:19 (0x01b6)',
    source: `${INIT_RC}:17`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/modprobe',
    android: '',
    clean: '/sbin/modprobe',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:22`,
  },
  // An oops on a host that panics takes down every other tenant instead of killing the task that caused it.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/panic_on_oops',
    android: '1',
    clean: '0',
    cleanFrom: config('CONFIG_PANIC_ON_OOPS_VALUE=0'),
    source: `${INIT_RC}:274`,
  },
  // 0 at init, then the timeout of llkd once khungtask is enabled.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_timeout_secs',
    android: '*',
    clean: '120',
    cleanFrom: config('CONFIG_DEFAULT_HUNG_TASK_TIMEOUT=120'),
    source: `${INIT_RC}:275, system/etc/init/llkd.rc:26`,
  },
  // The kernel also decrements it on each warning it prints: a host that warned needs `arm.sh --repair` to arm again.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_warnings',
    android: '65535',
    clean: '10',
    cleanFrom: KERNEL,
    source: 'system/etc/init/llkd.rc:27',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_check_count',
    android: '65535',
    clean: '4194304',
    cleanFrom: `${KERNEL} (PID_MAX_LIMIT)`,
    source: 'system/etc/init/llkd.rc:28',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/hung_task_panic',
    android: '1',
    clean: '0',
    cleanFrom: KERNEL,
    source: 'system/etc/init/llkd.rc:29',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/randomize_va_space',
    android: '2',
    clean: '2',
    cleanFrom: config('CONFIG_COMPAT_BRK non défini'),
    source: `${INIT_RC}:287`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/mmap_min_addr',
    android: '32768',
    clean: '65536',
    cleanFrom: config('CONFIG_DEFAULT_MMAP_MIN_ADDR=65536'),
    source: `${INIT_RC}:288`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/watermark_boost_factor',
    android: '0',
    clean: '15000',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:441`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/overcommit_memory',
    android: '1',
    clean: '1',
    cleanFrom: '/etc/sysctl.d/99-dev.conf:4',
    source: `${INIT_RC}:1114`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/sched_schedstats',
    android: '1',
    clean: '0',
    cleanFrom: `${KERNEL} (sans le paramètre de démarrage schedstats)`,
    source: 'system/etc/init/atrace.rc:10',
  },
  // -1 when the kernel exposes perf hooks to an LSM, 3 otherwise.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_event_paranoid',
    android: '*',
    clean: '3',
    cleanFrom: config('CONFIG_SECURITY_PERF_EVENTS_RESTRICT=y'),
    source: `${INIT_RC}:1255-1259`,
  },
  // The kernel also lowers it by itself when perf interrupts take too long.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_event_max_sample_rate',
    android: '*',
    clean: '100000',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:1269`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_cpu_time_max_percent',
    android: '25',
    clean: '25',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:1270`,
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/perf_event_mlock_kb',
    android: '516',
    clean: '516',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:1271`,
  },
  // 2 from init, 0 or 2 again when a userdebug build lowers or raises it.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/kptr_restrict',
    android: '*',
    clean: '0',
    cleanFrom: KERNEL,
    source: `init (SetKptrRestrictAction), ${INIT_RC}:1276-1279`,
  },
  // The largest value the kernel accepts; Android's boot fails if the write does, so the guard waits for the boot.
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/mmap_rnd_bits',
    android: '*',
    clean: '28',
    cleanFrom: config('CONFIG_ARCH_MMAP_RND_BITS=28'),
    source: 'init (SetMmapRndBitsAction)',
  },
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/mmap_rnd_compat_bits',
    android: '*',
    clean: '8',
    cleanFrom: config('CONFIG_ARCH_MMAP_RND_COMPAT_BITS=8'),
    source: 'init (SetMmapRndBitsAction)',
  },
  // The kernel refuses to lower it: a host armed with 0 could never be given 0 back.
  {
    kind: 'sysctl',
    key: '/proc/sys/kernel/unprivileged_bpf_disabled',
    android: '2',
    clean: '2',
    cleanFrom: config('CONFIG_BPF_UNPRIV_DEFAULT_OFF=y'),
    source: 'apex com.android.tethering: netbpfload',
  },
  // Written at run time by ActivityManager through extra_free_kbytes.sh.
  {
    kind: 'sysctl',
    key: '/proc/sys/vm/watermark_scale_factor',
    android: '*',
    clean: '10',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:1234`,
  },
  // /proc entries: procfs copies an owner or mode changed through any mount to the kernel-wide entry.
  {
    kind: 'procattr',
    key: '/proc/sysrq-trigger',
    android: '220 0 1000',
    clean: '200 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:582-583`,
  },
  {
    kind: 'procattr',
    key: '/proc/kmsg',
    android: '440 0 1000',
    clean: '400 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:580-581`,
  },
  {
    kind: 'procattr',
    key: '/proc/pressure/memory',
    android: '664 1000 1000',
    clean: '666 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:393-394`,
  },
  {
    kind: 'procattr',
    key: '/proc/slabinfo',
    android: '440 0 1007',
    clean: '400 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:573-574`,
  },
  {
    kind: 'procattr',
    key: '/proc/pagetypeinfo',
    android: '440 0 1007',
    clean: '400 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:576-577`,
  },
  {
    kind: 'procattr',
    key: '/proc/cmdline',
    android: '440 0 1001',
    clean: '444 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:1204, init`,
  },
  // Redroid mounts an empty file over it first (vendor/etc/init/redroid.common.rc:63): kept in case that ever races.
  {
    kind: 'procattr',
    key: '/proc/vmallocinfo',
    android: '440 0 1007',
    clean: '400 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:570-571`,
  },
  // sysfs: kernfs keeps one owner and mode per node for every mount.
  {
    kind: 'sysfsattr',
    key: '/sys/power/wakeup_count',
    android: '644 1000 1000',
    clean: '644 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:430`,
  },
  // Redroid mounts an empty file over it first (vendor/etc/init/redroid.common.rc:66).
  {
    kind: 'sysfsattr',
    key: '/sys/power/state',
    android: '660 1000 1000',
    clean: '644 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:429-431`,
  },
  {
    kind: 'sysfsattr',
    key: '/sys/firmware/acpi/tables',
    android: '755 1000 1000',
    clean: '755 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:1201`,
  },
  // Only when a device configuration flag is set, which nothing sets without Google services.
  {
    kind: 'sysfsval',
    key: '/sys/kernel/mm/lru_gen/enabled',
    android: '*',
    clean: '0x0007',
    cleanFrom: config('CONFIG_LRU_GEN_ENABLED=y et CONFIG_LRU_GEN_WALKS_MMU=y'),
    source: `${INIT_RC}:1320-1329`,
  },
  // debugfs and tracefs: one filesystem each for the whole kernel, whatever mounts it.
  {
    kind: 'superopts',
    key: '/sys/kernel/debug',
    android: 'rw,mode=755',
    clean: 'rw',
    cleanFrom: 'montage sans option de systemd (sys-kernel-debug.mount)',
    source: 'vendor/etc/init/redroid.common.rc:2',
  },
  {
    kind: 'superopts',
    key: '/sys/kernel/tracing',
    android: 'rw,gid=3012',
    clean: 'rw',
    cleanFrom: 'montage sans option de systemd (sys-kernel-tracing.mount)',
    source: `${INIT_RC}:78`,
  },
  {
    kind: 'mountroot',
    key: '/sys/kernel/debug',
    android: '755 0 0',
    clean: '700 0 0',
    cleanFrom: KERNEL,
    source: 'system/etc/init/init-debug.rc:12',
  },
  {
    kind: 'mountroot',
    key: '/sys/kernel/tracing',
    android: '*',
    clean: '700 0 0',
    cleanFrom: KERNEL,
    source: `${INIT_RC}:78`,
  },
  {
    kind: 'tracefsval',
    key: 'tracing_on',
    android: '0',
    clean: '1',
    cleanFrom: KERNEL,
    source: 'system/etc/init/atrace.rc:316-317',
  },
  // Instances outlive the container: only rmdir removes them.
  {
    kind: 'tracefs-instance',
    key: 'bootreceiver',
    android: 'present',
    clean: ABSENT,
    cleanFrom: NO_INSTANCE,
    source: `${INIT_RC}:640-644`,
  },
  {
    kind: 'tracefs-instance',
    key: 'wifi',
    android: 'present',
    clean: ABSENT,
    cleanFrom: NO_INSTANCE,
    source: 'system/etc/init/wifi.rc:30-38',
  },
];

/** atrace makes about 175 tracefs files readable and writable by all, `kprobe_events` and `set_event` included. */
export const ANDROID_WILDCARDS: readonly AndroidWildcard[] = [
  { kind: 'tracefsattr', android: '*', source: 'system/etc/init/atrace.rc, atrace_userdebug.rc' },
];

/**
 * Sysctls the kernel moves on its own, which no snapshot compares: `ns_last_pid` follows every process the host
 * starts, and `tainted` only gains bits, so a write could never give an untainted kernel back.
 */
export const VOLATILE_SYSCTLS = ['/proc/sys/kernel/ns_last_pid', '/proc/sys/kernel/tainted'] as const;

/** Sysctls the guard never reads: reading `stat_refresh` makes the kernel refresh its counters. */
export const SKIPPED_SYSCTLS = ['/proc/sys/vm/stat_refresh'] as const;

/**
 * Fewer records of a kind than this means a reader saw nothing: the host has a few hundred sysctls, /proc entries and
 * tracefs entries, two debugfs and tracefs mounts, and the listed sysfs paths.
 */
export const MINIMUM_RECORDS: Readonly<Record<SnapshotKind, number>> = {
  superopts: 2,
  mountroot: 2,
  sysctl: 100,
  procattr: 100,
  sysfsattr: 3,
  sysfsval: 1,
  tracefsattr: 100,
  tracefsval: 1,
  'tracefs-instance': 0,
};
