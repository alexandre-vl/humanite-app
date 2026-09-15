import { describe, expect, test } from 'vitest';
import { EMULATOR } from '../config.ts';
import type { MemorySample } from './memory.ts';
import { cgroupMib, meminfoMib, missedThresholds, pressureAvg60, waitForCalm } from './memory.ts';

const MEMINFO =
  'MemTotal:       32869552 kB\nMemFree:         3236988 kB\nMemAvailable:   18388404 kB\nSwapFree:        3707212 kB\n';

const CALM: MemorySample = { availableMib: 18_000, swapFreeMib: 11_000, userSliceMib: 14_000, pressureAvg60: 0.4 };

const BUSY: MemorySample = { ...CALM, pressureAvg60: 66.05 };

test('reads meminfo fields, pressure and cgroup memory in MiB', () => {
  expect(meminfoMib(MEMINFO, 'MemAvailable')).toBe(17_957);
  expect(meminfoMib(MEMINFO, 'SwapFree')).toBe(3_620);
  expect(
    pressureAvg60(
      'some avg10=0.00 avg60=5.29 avg300=32.05 total=190523363379\nfull avg10=0.00 avg60=2.07 avg300=11.16 total=1\n',
    ),
  ).toBe(5.29);
  expect(cgroupMib('13672890368\n')).toBe(13_039);
  expect(() => meminfoMib('MemTotal: 1 kB\n', 'SwapFree')).toThrow('SwapFree');
});

test('names every threshold a sample misses', () => {
  expect(missedThresholds(CALM, EMULATOR.build.calm)).toEqual([]);
  expect(
    missedThresholds(
      { availableMib: 12_325, swapFreeMib: 3_620, userSliceMib: 15_980, pressureAvg60: 82.71 },
      EMULATOR.build.calm,
    ),
  ).toHaveLength(4);
});

describe('waitForCalm', () => {
  const watch = (samples: readonly MemorySample[]) => {
    let clock = 0;
    let index = 0;
    const seen: number[] = [];
    return {
      seen,
      watch: {
        sample: async () => Promise.resolve(samples[Math.min(index++, samples.length - 1)] ?? CALM),
        wait: async (milliseconds: number) => {
          clock += milliseconds;
          return Promise.resolve();
        },
        now: () => clock,
        report: (sample: MemorySample, missed: readonly string[], calmInARow: number) => {
          seen.push(calmInARow);
        },
      },
    };
  };

  test('returns once enough calm samples come in a row, a busy one starting the count again', async () => {
    const { seen, watch: calmWatch } = watch([CALM, BUSY, CALM, CALM, CALM]);
    expect(await waitForCalm(EMULATOR.build.calm, calmWatch)).toBe(true);
    expect(seen).toEqual([1, 0, 1, 2, 3]);
  });

  test('gives up when the window does not come before the deadline', async () => {
    const { seen, watch: busyWatch } = watch([BUSY]);
    const thresholds = { ...EMULATOR.build.calm, maxWaitMs: 3 * EMULATOR.build.calm.intervalMs };
    expect(await waitForCalm(thresholds, busyWatch)).toBe(false);
    expect(seen).toEqual([0, 0, 0, 0]);
  });
});
