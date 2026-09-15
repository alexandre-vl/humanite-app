import { expect, test } from 'vitest';
import type { Evidence, Step } from './steps.ts';
import { runSteps } from './steps.ts';

/** A step whose checks return `evidences` in turn, the last one repeated, and that counts its applications. */
function step(id: string, evidences: readonly Evidence[], apply = true): Step & Readonly<{ applied: () => number }> {
  let checks = 0;
  let applications = 0;
  return {
    id,
    summary: id,
    check: async () =>
      Promise.resolve(evidences[Math.min(checks++, evidences.length - 1)] ?? { state: 'done', line: '' }),
    apply: apply
      ? async () => {
          applications += 1;
          return Promise.resolve();
        }
      : null,
    settleMs: 50,
    applied: () => applications,
  };
}

const done = (line: string): Evidence => ({ state: 'done', line });

const todo = (line: string): Evidence => ({ state: 'todo', line });

test('skips a step already done, applies a step to do, and waits for a postcondition to hold', async () => {
  const skipped = step('skipped', [done('déjà là')]);
  const applied = step('applied', [todo('absent'), todo('en cours'), done('présent')]);
  const awaited = step('awaited', [todo('en cours'), done('prêt')], false);
  const outcomes: string[] = [];
  const report = await runSteps([skipped, applied, awaited], {
    signal: new AbortController().signal,
    pollMs: 1,
    report: (outcome) => outcomes.push(`${outcome.id}:${String(outcome.applied)}:${outcome.line}`),
  });
  expect(report.failure).toBeNull();
  expect(outcomes).toEqual(['skipped:false:déjà là', 'applied:true:présent', 'awaited:true:prêt']);
  expect([skipped.applied(), applied.applied()]).toEqual([0, 1]);
});

test('stops at the first postcondition that does not hold: later steps never run', async () => {
  const failing = step('failing', [todo('jamais prêt')]);
  const blocked = step('blocked', [{ state: 'blocked', line: 'réservé à root', remedy: 'sudo …' }]);
  const later = step('later', [todo('absent')]);
  const first = await runSteps([failing, later], {
    signal: new AbortController().signal,
    pollMs: 5,
    report: () => undefined,
  });
  expect(first.failure).toEqual({ id: 'failing', summary: 'failing', line: 'jamais prêt', remedy: null });
  const second = await runSteps([blocked, later], {
    signal: new AbortController().signal,
    pollMs: 5,
    report: () => undefined,
  });
  expect(second.failure).toMatchObject({ id: 'blocked', remedy: 'sudo …' });
  expect(later.applied()).toBe(0);
});
