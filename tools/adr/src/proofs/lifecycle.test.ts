import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { CHECK_FIXTURES } from './checks.ts';
import type { LifecycleCode } from './lifecycle.ts';
import { LIFECYCLE_CODES, LIFECYCLE_FIXTURES } from './lifecycle.ts';

test('every lifecycle code is reached by at least one fixture', () => {
  expectTypeOf<Coverage<LifecycleCode, typeof LIFECYCLE_FIXTURES>>().toEqualTypeOf<true>();
  const expected = new Set(LIFECYCLE_FIXTURES.flatMap((fixture) => fixture.expected));
  expect(LIFECYCLE_CODES.filter((code) => !expected.has(code))).toEqual([]);
});

test('proof ids are unique across the check and lifecycle fixtures', () => {
  expect(findDuplicateIds([...CHECK_FIXTURES, ...LIFECYCLE_FIXTURES])).toEqual([]);
});

describe.concurrent('each lifecycle fixture reports exactly its expected codes', () => {
  test.each(LIFECYCLE_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    60_000,
  );
});
