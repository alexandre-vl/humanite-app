import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { LintCode } from '../checks.ts';
import { LINT_FIXTURES } from './lint.ts';

test('every lint code is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<LintCode, typeof LINT_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(LINT_FIXTURES)).toEqual([]);
});

describe('each lint fixture reports exactly its expected codes', () => {
  test.each(LINT_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
