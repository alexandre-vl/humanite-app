import { describe, expect, test } from 'vitest';
import type { Fixture } from './bench.ts';
import { runFixture, SETTLE_MS } from './bench.ts';

/** Time the runner needs around a test of its own: collecting it, reporting it, and a margin on a loaded host. */
const RUNNER_MS = 5_000;

/**
 * Time a test runner must give a test that runs `fixtures` one after the other: every budget they declare, the time
 * the last of them gets to stop what it started once its signal is aborted, and a margin for the runner itself.
 */
export const testTimeoutMs = (fixtures: readonly Fixture<string, string>[]): number =>
  fixtures.reduce((total, fixture) => total + fixture.timeoutMs, 0) + SETTLE_MS + RUNNER_MS;

/**
 * Runs each fixture of `fixtures` as its own test, named by its id: it must report exactly the codes it expects. Each
 * one brings the budget and the concurrency it declares, so a list never repeats what its fixtures already say.
 *
 * `skipIf` skips the whole group — for a bench that only means something on a platform the run is not on, so it is
 * reported skipped rather than failed. The judging it skips still runs where that platform is, on the server.
 */
export function testFixtures(
  title: string,
  fixtures: readonly Fixture<string, string>[],
  options: Readonly<{ skipIf?: boolean }> = {},
): void {
  describe.skipIf(options.skipIf ?? false)(title, () => {
    for (const fixture of fixtures) {
      // Vitest runs consecutive tests of the same concurrency together, so a serial fixture ends the group before it.
      const one = fixture.concurrency === 'serial' ? test : test.concurrent;
      one(
        fixture.id,
        async () => {
          // The whole report is compared, so that a failure shows the codes missing or unexpected, or the crash.
          const { durationMs, ...report } = await runFixture(fixture);
          expect(report, `${String(durationMs)} ms`).toEqual({ id: fixture.id, outcome: 'passed' });
        },
        testTimeoutMs([fixture]),
      );
    }
  });
}
