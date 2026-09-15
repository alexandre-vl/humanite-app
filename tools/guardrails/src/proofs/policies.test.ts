import type { Coverage } from '@huma/fixtures';
import { runFixture } from '@huma/fixtures';
import { testFixtures, testTimeoutMs } from '@huma/fixtures/vitest';
import type { PolicyId } from '@huma/eslint-config/policies';
import { POLICY_IDS } from '@huma/eslint-config/policies';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { POLICY_FIXTURES, policyMutants } from './policies.ts';

test('every lint policy is proven by a fixture', () => {
  expectTypeOf<Coverage<PolicyId, typeof POLICY_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each policy fixture reports exactly its policies', POLICY_FIXTURES);

describe('each policy holds its fixtures: without it, they miss exactly that policy', () => {
  for (const policy of POLICY_IDS) {
    const mutants = policyMutants(policy);
    test(
      policy,
      async () => {
        expect(mutants).not.toHaveLength(0);
        for (const fixture of mutants) {
          expect(await runFixture(fixture)).toMatchObject({ outcome: 'failed', missing: [policy], unexpected: [] });
        }
      },
      testTimeoutMs(mutants),
    );
  }
});
