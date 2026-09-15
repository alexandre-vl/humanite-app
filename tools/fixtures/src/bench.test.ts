import { capture } from '@huma/kit/process';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { Coverage } from './bench.ts';
import { findDuplicateIds, fixtureFactory, runFixture, SETTLE_MS, uncoveredCodes } from './bench.ts';

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

  test('a fixture over its budget is aborted, and its report waits until the work it started has stopped', async () => {
    let stopped = false;
    const report = await runFixture(
      define('slow', 'lente', [], async ({ signal }) => {
        const result = await capture('sleep', ['30'], { cwd: process.cwd(), signal });
        stopped = result.exit.kind === 'aborted';
        return [];
      }),
      { timeoutMs: 50 },
    );
    expect(report).toMatchObject({ outcome: 'crashed', error: 'délai de 50 ms dépassé' });
    expect(stopped).toBe(true);
    expect(report.durationMs).toBeLessThan(SETTLE_MS);
  });

  test('a fixture that ignores its signal is reported once the settling time is over', async () => {
    const report = await runFixture(
      define('stubborn', 'têtue', [], async () => {
        await waiting(SETTLE_MS + 2_000);
        return [];
      }),
      { timeoutMs: 20 },
    );
    expect(report).toMatchObject({ outcome: 'crashed' });
    expect(report.durationMs).toBeGreaterThanOrEqual(SETTLE_MS);
    expect(report.durationMs).toBeLessThan(SETTLE_MS + 1_500);
  }, 15_000);
});

test('findDuplicateIds lists each repeated id once, sorted', () => {
  const ids = ['b', 'a', 'b', 'c', 'a', 'b'];
  expect(findDuplicateIds(ids.map((id) => define(id, id, [], observing([]))))).toEqual(['a', 'b']);
});

describe('Coverage', () => {
  const one = define('one', 'un', ['a/one'], observing(['a/one']));
  const both = define('both', 'deux', ['a/one', 'a/two'], observing(['a/one', 'a/two']));
  const widened: readonly Code[] = ['a/one'];
  const loose = define('loose', 'élargi', widened, observing(widened));
  const flag = Math.random() < 2;
  const branchy = define('branchy', 'selon un drapeau', flag ? ['a/one'] : ['a/two'], observing(['a/one']));

  test('resolves to true once every code is expected by a literal tuple', () => {
    expect([one, both, loose, branchy].map((fixture) => fixture.id)).toEqual(['one', 'both', 'loose', 'branchy']);
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

  test('refuses a fixture whose expected codes are a union of tuples', () => {
    expectTypeOf<Coverage<Code, readonly [typeof both, typeof branchy]>>().toEqualTypeOf<
      Readonly<{ notLiteral: 'branchy' }>
    >();
  });

  test('uncoveredCodes gives the same answer at run time', () => {
    expect(uncoveredCodes<Code>(['a/one', 'a/two'], [one])).toEqual(['a/two']);
    expect(uncoveredCodes<Code>(['a/one', 'a/two'], [one, both])).toEqual([]);
  });
});
