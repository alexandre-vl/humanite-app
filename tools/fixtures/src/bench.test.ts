import { describe, expect, expectTypeOf, test } from 'vitest';
import type { Coverage, Fixture } from './bench.ts';
import { findDuplicateIds, fixtureFactory, formatReports, runFixture, runFixtures } from './bench.ts';

type Code = 'a/one' | 'a/two';

const define = fixtureFactory<Code>();

const observing = (codes: readonly Code[]) => async (): Promise<readonly Code[]> => Promise.resolve(codes);

const waiting = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

describe('runFixture', () => {
  test('passes when the observed codes equal the expected set, whatever their order and repetition', async () => {
    const report = await runFixture(
      define('equal', 'égal', ['a/one', 'a/two'], observing(['a/two', 'a/one', 'a/two'])),
    );
    expect(report).toMatchObject({ id: 'equal', outcome: 'passed' });
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('passes a valid fixture that expects and observes no code', async () => {
    expect(await runFixture(define('valid', 'valide', [], observing([])))).toMatchObject({ outcome: 'passed' });
  });

  test('fails with the sorted missing and unexpected codes', async () => {
    const report = await runFixture(define('diff', 'écart', ['a/two'], observing(['a/one'])));
    expect(report).toMatchObject({ id: 'diff', outcome: 'failed', missing: ['a/two'], unexpected: ['a/one'] });
  });

  test('reports a throwing run as crashed, never as passed', async () => {
    const report = await runFixture(
      define('crash', 'plantage', [], async () => {
        await Promise.resolve();
        throw new Error('boom');
      }),
    );
    expect(report.outcome === 'crashed' ? report.error : '').toContain('boom');
  });

  test('describes a non-Error throw without calling its toString', async () => {
    const report = await runFixture(
      define('value', 'valeur', [], async () => {
        await Promise.resolve();
        throw Object.create(null);
      }),
    );
    expect(report).toMatchObject({ outcome: 'crashed', error: 'valeur non Error levée (object)' });
  });

  test('crashes a fixture that exceeds its time budget and aborts its signal', async () => {
    let aborted = false;
    const report = await runFixture(
      define('slow', 'lente', [], async ({ signal }) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        await waiting(1_000);
        return [];
      }),
      { timeoutMs: 20 },
    );
    expect(report).toMatchObject({ outcome: 'crashed' });
    expect(report.outcome === 'crashed' ? report.error : '').toContain('délai de 20 ms dépassé');
    expect(aborted).toBe(true);
  });
});

describe('runFixtures', () => {
  test('keeps the input order when later fixtures finish first', async () => {
    const delayed = (id: string, milliseconds: number): Fixture<string, Code> =>
      define(id, id, [], async () => {
        await waiting(milliseconds);
        return [];
      });
    const reports = await runFixtures([delayed('slow', 30), delayed('fast', 1), delayed('medium', 10)], {
      concurrency: 3,
    });
    expect(reports.map((report) => report.id)).toEqual(['slow', 'fast', 'medium']);
  });
});

test('findDuplicateIds lists each repeated id once, sorted', () => {
  const ids = ['b', 'a', 'b', 'c', 'a', 'b'];
  expect(findDuplicateIds(ids.map((id) => define(id, id, [], observing([]))))).toEqual(['a', 'b']);
});

test('formatReports prints one line per fixture and the conforming count', () => {
  const text = formatReports([
    { id: 'ok', durationMs: 1, outcome: 'passed' },
    { id: 'diff', durationMs: 1, outcome: 'failed', missing: ['a/two'], unexpected: [] },
    { id: 'crash', durationMs: 1, outcome: 'crashed', error: 'Error: boom\n    at stack' },
  ]);
  expect(text.split('\n')).toEqual([
    '✓ ok',
    '✗ diff — manquants : a/two ; en trop : ∅',
    '✗ crash — plantage : Error: boom',
    '1/3 fixtures conformes',
  ]);
});

describe('Coverage', () => {
  const one = define('one', 'un', ['a/one'], observing(['a/one']));
  const both = define('both', 'deux', ['a/one', 'a/two'], observing(['a/one', 'a/two']));
  const widened: readonly Code[] = ['a/one'];
  const loose = define('loose', 'élargi', widened, observing(widened));

  test('resolves to true once every code is expected by a literal tuple', () => {
    expect([one, both, loose].map((fixture) => fixture.id)).toEqual(['one', 'both', 'loose']);
    expectTypeOf<Coverage<Code, readonly [typeof one, typeof both]>>().toEqualTypeOf<true>();
  });

  test('names the uncovered codes', () => {
    expectTypeOf<Coverage<Code, readonly [typeof one]>>().toEqualTypeOf<Readonly<{ uncovered: 'a/two' }>>();
  });

  test('refuses a fixture whose expected codes were widened to an array', () => {
    expectTypeOf<Coverage<Code, readonly [typeof both, typeof loose]>>().toEqualTypeOf<
      Readonly<{ notLiteral: 'loose' }>
    >();
  });
});
