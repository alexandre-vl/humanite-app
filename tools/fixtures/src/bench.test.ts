import { describe, expect, expectTypeOf, test } from 'vitest';
import type { Coverage, Fixture } from './bench.ts';
import { findDuplicateIds, formatReports, runFixture, runFixtures } from './bench.ts';

type Code = 'a/one' | 'a/two';

const fixture = (
  id: string,
  expected: readonly Code[],
  run: () => Promise<readonly Code[]>,
): Fixture<string, Code> => ({ id, description: id, expected, run });

const observing = (codes: readonly Code[]) => async (): Promise<readonly Code[]> => {
  await Promise.resolve();
  return codes;
};

const waiting = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

describe('runFixture', () => {
  test('passes when the observed codes equal the expected set, whatever their order and repetition', async () => {
    const report = await runFixture(fixture('equal', ['a/one', 'a/two'], observing(['a/two', 'a/one', 'a/two'])));
    expect(report).toEqual({ id: 'equal', outcome: 'passed' });
  });

  test('passes a valid fixture that expects and observes no code', async () => {
    expect(await runFixture(fixture('valid', [], observing([])))).toEqual({ id: 'valid', outcome: 'passed' });
  });

  test('fails with the sorted missing and unexpected codes', async () => {
    const report = await runFixture(fixture('diff', ['a/two'], observing(['a/one'])));
    expect(report).toEqual({ id: 'diff', outcome: 'failed', missing: ['a/two'], unexpected: ['a/one'] });
  });

  test('reports a throwing run as crashed, never as passed', async () => {
    const report = await runFixture(
      fixture('crash', [], async () => {
        await Promise.resolve();
        throw new Error('boom');
      }),
    );
    expect(report.outcome).toBe('crashed');
    expect(report.outcome === 'crashed' ? report.error : '').toContain('boom');
  });

  test('describes a non-Error throw without calling its toString', async () => {
    const report = await runFixture(
      fixture('value', [], async () => {
        await Promise.resolve();
        throw Object.create(null);
      }),
    );
    expect(report).toEqual({ id: 'value', outcome: 'crashed', error: 'non-Error value thrown (object)' });
  });
});

describe('runFixtures', () => {
  test('keeps the input order when later fixtures finish first', async () => {
    const delayed = (id: string, milliseconds: number): Fixture<string, Code> =>
      fixture(id, [], async () => {
        await waiting(milliseconds);
        return [];
      });
    const reports = await runFixtures([delayed('slow', 30), delayed('fast', 1), delayed('medium', 10)], {
      concurrency: 3,
    });
    expect(reports.map((report) => report.id)).toEqual(['slow', 'fast', 'medium']);
  });

  test('never runs more fixtures at once than the concurrency limit', async () => {
    let running = 0;
    let peak = 0;
    const tracked = (id: string): Fixture<string, Code> =>
      fixture(id, [], async () => {
        running += 1;
        peak = Math.max(peak, running);
        await waiting(5);
        running -= 1;
        return [];
      });
    await runFixtures(['1', '2', '3', '4', '5'].map(tracked), { concurrency: 2 });
    expect(peak).toBe(2);
  });
});

test('findDuplicateIds lists each repeated id once, sorted', () => {
  const ids = ['b', 'a', 'b', 'c', 'a', 'b'];
  expect(findDuplicateIds(ids.map((id) => fixture(id, [], observing([]))))).toEqual(['a', 'b']);
});

test('formatReports prints one line per fixture and the conforming count', () => {
  const text = formatReports([
    { id: 'ok', outcome: 'passed' },
    { id: 'diff', outcome: 'failed', missing: ['a/two'], unexpected: [] },
    { id: 'crash', outcome: 'crashed', error: 'Error: boom\n    at stack' },
  ]);
  expect(text.split('\n')).toEqual([
    '✓ ok',
    '✗ diff — manquants : a/two ; en trop : ∅',
    '✗ crash — plantage : Error: boom',
    '1/3 fixtures conformes',
  ]);
});

test('Coverage resolves to the codes that no fixture expects', () => {
  type OnlyOne = readonly [Fixture<'f', Code> & { expected: readonly ['a/one'] }];
  type Both = readonly [Fixture<'f', Code> & { expected: readonly ['a/one', 'a/two'] }];
  expectTypeOf<Coverage<Code, OnlyOne>>().toEqualTypeOf<'a/two'>();
  expectTypeOf<Coverage<Code, Both>>().toEqualTypeOf<true>();
});
