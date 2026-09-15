import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import type { CalmThresholds } from '../config.ts';

/** The memory figures of the shared host a calm window depends on. */
export type MemorySample = Readonly<{
  availableMib: number;
  swapFreeMib: number;
  /** Memory of every session and service of the users, agents included. */
  userSliceMib: number;
  /** `some avg60` of the host's memory pressure, in percent. */
  pressureAvg60: number;
}>;

type MeminfoField = 'MemAvailable' | 'SwapFree';

const KIB_PER_MIB = 1024;

const BYTES_PER_MIB = 1024 * 1024;

/** A field of `/proc/meminfo`, in MiB. */
export function meminfoMib(text: string, field: MeminfoField): number {
  const line = text.split('\n').find((candidate) => candidate.startsWith(`${field}:`));
  const kib = /^\w+:\s+(?<kib>\d+) kB$/u.exec(line ?? '')?.groups?.['kib'];
  if (kib === undefined) {
    throw new Error(`/proc/meminfo : champ ${field} illisible`);
  }
  return Math.floor(Number(kib) / KIB_PER_MIB);
}

/** `avg60` of the `some` line of a pressure file of `/proc/pressure`. */
export function pressureAvg60(text: string): number {
  const avg60 = /^some avg10=[\d.]+ avg60=(?<avg60>[\d.]+) /mu.exec(text)?.groups?.['avg60'];
  if (avg60 === undefined) {
    throw new Error('/proc/pressure/memory : ligne some illisible');
  }
  return Number(avg60);
}

/** `memory.current` of a cgroup, in MiB. */
export function cgroupMib(text: string): number {
  const bytes = /^(?<bytes>\d+)\n?$/u.exec(text)?.groups?.['bytes'];
  if (bytes === undefined) {
    throw new Error('memory.current illisible');
  }
  return Math.floor(Number(bytes) / BYTES_PER_MIB);
}

export async function sampleMemory(): Promise<MemorySample> {
  const meminfo = await readFile('/proc/meminfo', 'utf8');
  return {
    availableMib: meminfoMib(meminfo, 'MemAvailable'),
    swapFreeMib: meminfoMib(meminfo, 'SwapFree'),
    userSliceMib: cgroupMib(await readFile('/sys/fs/cgroup/user.slice/memory.current', 'utf8')),
    pressureAvg60: pressureAvg60(await readFile('/proc/pressure/memory', 'utf8')),
  };
}

/** The thresholds `sample` misses, as one line each; none when the host is calm. */
export const missedThresholds = (sample: MemorySample, thresholds: CalmThresholds): readonly string[] => [
  ...(sample.availableMib < thresholds.minAvailableMib
    ? [`mémoire disponible ${String(sample.availableMib)} Mio < ${String(thresholds.minAvailableMib)}`]
    : []),
  ...(sample.swapFreeMib < thresholds.minSwapFreeMib
    ? [`swap libre ${String(sample.swapFreeMib)} Mio < ${String(thresholds.minSwapFreeMib)}`]
    : []),
  ...(sample.userSliceMib > thresholds.maxUserSliceMib
    ? [`user.slice ${String(sample.userSliceMib)} Mio > ${String(thresholds.maxUserSliceMib)}`]
    : []),
  ...(sample.pressureAvg60 >= thresholds.maxPressureAvg60
    ? [`pression avg60 ${String(sample.pressureAvg60)} ≥ ${String(thresholds.maxPressureAvg60)}`]
    : []),
];

export type CalmWatch = Readonly<{
  sample: () => Promise<MemorySample>;
  wait: (milliseconds: number) => Promise<void>;
  now: () => number;
  /** Told of every sample, with the thresholds it misses and the calm samples in a row so far. */
  report: (sample: MemorySample, missed: readonly string[], calmInARow: number) => void;
}>;

/**
 * Samples the host until `thresholds.samples` samples in a row are calm, `intervalMs` apart; `false` when the window
 * does not come within `maxWaitMs`.
 */
export async function waitForCalm(thresholds: CalmThresholds, watch: CalmWatch): Promise<boolean> {
  const deadline = watch.now() + thresholds.maxWaitMs;
  let calmInARow = 0;
  for (;;) {
    const sample = await watch.sample();
    const missed = missedThresholds(sample, thresholds);
    calmInARow = missed.length === 0 ? calmInARow + 1 : 0;
    watch.report(sample, missed, calmInARow);
    if (calmInARow >= thresholds.samples) {
      return true;
    }
    if (watch.now() + thresholds.intervalMs > deadline) {
      return false;
    }
    await watch.wait(thresholds.intervalMs);
  }
}

/** The watch of the real host: its memory, real waits and the real clock. */
export const hostCalmWatch = (signal: AbortSignal, report: CalmWatch['report']): CalmWatch => ({
  sample: sampleMemory,
  wait: async (milliseconds) => {
    await sleep(milliseconds, undefined, { signal });
  },
  now: () => Date.now(),
  report,
});
