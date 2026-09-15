/**
 * The Android emulator of the development server: Redroid 15, Android in a privileged Docker container that runs on
 * the host kernel. Each value was measured by the spike (`docs/spikes/phase-0a.md`, verifications 11 to 21); the
 * commands, the root guard and the table the guard reads all take them from here.
 */

/** When the shared host is calm enough for a native build: every threshold holds on several samples in a row. */
export type CalmThresholds = Readonly<{
  minAvailableMib: number;
  minSwapFreeMib: number;
  maxUserSliceMib: number;
  /** Ceiling of the `some avg60` memory pressure of the host, in percent. */
  maxPressureAvg60: number;
  samples: number;
  intervalMs: number;
  /** How long a build waits for its window before it gives up. */
  maxWaitMs: number;
}>;

export type EmulatorConfig = Readonly<{
  image: Readonly<{
    /** Local tag, for people: the container runs the image id. */
    reference: string;
    id: `sha256:${string}`;
    /** Registry digest the image was pulled as. */
    digest: `${string}@sha256:${string}`;
  }>;
  container: string;
  network: string;
  volume: string;
  /** Published on the loopback only: whoever reaches adb of a privileged container is root on the host. */
  adb: Readonly<{ host: '127.0.0.1'; port: number }>;
  limits: Readonly<{ memoryGib: number; cpus: number; pids: number }>;
  /** The binder devices the module creates on the host, each with the path Android expects inside the container. */
  binder: Readonly<{ module: string; devices: Readonly<Record<string, `/dev/${string}`>> }>;
  /** Arguments of Android's init. */
  bootArguments: Readonly<Record<`androidboot.${string}`, string>>;
  bootTimeoutMs: number;
  guard: Readonly<{
    /** The transient systemd timer and service that run the guard as root. */
    unit: string;
    installDirectory: `/${string}`;
    runDirectory: `/run/${string}`;
    tickSeconds: number;
    runTimeoutSeconds: number;
    /** The guard restores the host even when Android has not finished booting by then. */
    bootDeadlineSeconds: number;
    /** How long one run waits for Android's boot, to restore the host as soon as it ends, before leaving it to the next. */
    bootWaitSeconds: number;
    /** The timer stops itself once the container has been absent this long. */
    idleTtlSeconds: number;
  }>;
  lmkd: Readonly<{ minfreeLevelsProperty: string; reinitProperty: string }>;
  /** Query parameters of the dev client's deep link that skip its onboarding, its launcher and its floating button. */
  devClientFlags: Readonly<Record<string, '1'>>;
  metroPort: number;
  build: Readonly<{
    /** The transient user service that runs Gradle outside the process tree of whoever started the build. */
    unit: string;
    memoryHigh: string;
    memoryMax: string;
    cpuQuota: `${number}%`;
    /** CPUs Gradle may use: ninja sizes its jobs from the affinity mask and ignores the Gradle workers. */
    cpuAffinity: string;
    gradleJvmArgs: string;
    gradleWorkers: number;
    architectures: string;
    calm: CalmThresholds;
  }>;
  /** Directory of the Android SDK, relative to the home directory. */
  androidSdk: string;
  buildTools: string;
  /** Versions mise installs and runs. */
  tools: Readonly<{ java: string; maestro: string }>;
}>;

export const EMULATOR = {
  image: {
    reference: 'humanite/redroid:15.0.0_64only-250627',
    id: 'sha256:f096388ce85946ef6c599766043ce21e24e4b95e320702c03a4d77472c4db11f',
    digest: 'redroid/redroid@sha256:b51bde9cef80f7bd7581148192f2b2f4d41f23c6344cfe88eceeb8ddd67490ee',
  },
  container: 'humanite-redroid15',
  network: 'humanite-redroid-net',
  volume: 'humanite-redroid15-data',
  adb: { host: '127.0.0.1', port: 5555 },
  // Measured: 1.25 GiB with the app, a peak of 2 GiB.
  limits: { memoryGib: 3, cpus: 3, pids: 8192 },
  binder: {
    module: 'binder_linux',
    devices: { binder1: '/dev/binder', binder2: '/dev/hwbinder', binder3: '/dev/vndbinder' },
  },
  bootArguments: {
    'androidboot.redroid_width': '720',
    'androidboot.redroid_height': '1280',
    'androidboot.redroid_dpi': '320',
    'androidboot.redroid_fps': '15',
    // Software rendering: the host has no GPU for the container.
    'androidboot.redroid_gpu_mode': 'guest',
    // The host kernel has no ashmem: Android shares memory through memfd.
    'androidboot.use_memfd': '1',
  },
  // Boot took 15 s on every start of the spike.
  bootTimeoutMs: 180_000,
  guard: {
    unit: 'humanite-redroid-guard',
    installDirectory: '/usr/local/libexec/humanite-redroid',
    runDirectory: '/run/humanite-redroid',
    tickSeconds: 30,
    runTimeoutSeconds: 120,
    bootDeadlineSeconds: 180,
    bootWaitSeconds: 60,
    idleTtlSeconds: 14_400,
  },
  // lmkd reads the pressure of the whole host and killed the foreground app at 0.9 GiB used out of 3: minfree levels
  // make it judge free memory instead, while the container's own limit stays the safeguard.
  lmkd: {
    minfreeLevelsProperty: 'persist.device_config.lmkd_native.use_minfree_levels',
    reinitProperty: 'lmkd.reinit',
  },
  devClientFlags: { disableOnboarding: '1', disableAutoLaunch: '1', disableFab: '1' },
  metroPort: 8081,
  // Build 5 of the spike, from a clean `android/`: 12 min, a peak of 5.9 GiB, never killed.
  build: {
    unit: 'humanite-gradle-build',
    memoryHigh: '5600M',
    memoryMax: '6G',
    cpuQuota: '600%',
    cpuAffinity: '0-1',
    gradleJvmArgs: '-Xmx3g -XX:MaxMetaspaceSize=768m -Dfile.encoding=UTF-8',
    gradleWorkers: 1,
    architectures: 'x86_64',
    calm: {
      minAvailableMib: 14_336,
      minSwapFreeMib: 4_096,
      maxUserSliceMib: 15_872,
      maxPressureAvg60: 10,
      samples: 3,
      intervalMs: 60_000,
      maxWaitMs: 14_400_000,
    },
  },
  androidSdk: 'Android/Sdk',
  buildTools: '36.0.0',
  tools: { java: 'temurin-17.0.20+101', maestro: 'cli-2.10.0' },
} as const satisfies EmulatorConfig;
