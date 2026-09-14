import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { POLICY_IDS } from '@huma/eslint-config/policies';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { POLICY_FIXTURES, policyMutants } from './policies.ts';

test('every lint policy is proven by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<PolicyId, typeof POLICY_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(POLICY_FIXTURES)).toEqual([]);
});

// One after the other: the typed linter keeps one project service per process.
describe('each policy fixture reports exactly its policies', () => {
  test.each(POLICY_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});

describe('each policy holds its fixtures: without it, they miss exactly that policy', () => {
  test.each(POLICY_IDS)(
    '%s',
    async (policy) => {
      const fixtures = policyMutants(policy);
      expect(fixtures).not.toHaveLength(0);
      for (const fixture of fixtures) {
        expect(await runFixture(fixture)).toMatchObject({ outcome: 'failed', missing: [policy], unexpected: [] });
      }
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
