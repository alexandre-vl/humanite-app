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
 */
export function testFixtures(title: string, fixtures: readonly Fixture<string, string>[]): void {
  describe(title, () => {
    for (const fixture of fixtures) {
      // Vitest runs consecutive tests of the same concurrency together, so a serial fixture ends the group before it.
      const one = fixture.concurrency === 'serial' ? test : test.concurrent;
      one(
        fixture.id,
        async () => {
          expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
        },
        testTimeoutMs([fixture]),
      );
    }
  });
}
