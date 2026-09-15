import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { GuardCode } from '../checks.ts';
import { ROOT_FIXTURES } from './root.ts';

test('every code of the root guard is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<GuardCode, typeof ROOT_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(ROOT_FIXTURES)).toEqual([]);
});

describe('each root guard fixture reports exactly its expected codes', () => {
  test.concurrent.each(ROOT_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
