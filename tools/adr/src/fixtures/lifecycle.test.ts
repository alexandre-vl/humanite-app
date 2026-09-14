import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { LifecycleCode } from './lifecycle.ts';
import { LIFECYCLE_FIXTURES } from './lifecycle.ts';
import { PROOFS } from './proofs.ts';

test('every lifecycle code is reached by at least one fixture', () => {
  expectTypeOf<Coverage<LifecycleCode, typeof LIFECYCLE_FIXTURES>>().toEqualTypeOf<true>();
});

test('proof ids are unique across every fixture set', () => {
  expect(findDuplicateIds(PROOFS)).toEqual([]);
});

describe.concurrent('each lifecycle fixture reports exactly its expected codes', () => {
  test.each(LIFECYCLE_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toEqual({ id: fixture.id, outcome: 'passed' });
    },
    60_000,
  );
});
