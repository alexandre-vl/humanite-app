import type { Coverage } from '@huma/fixtures';
import { runFixture } from '@huma/fixtures';
import { testFixtures, testTimeoutMs } from '@huma/fixtures/vitest';
import type { PolicyId } from '@huma/eslint-config/policies';
import { POLICY_IDS, policyMessage, policyOf, policyTag } from '@huma/eslint-config/policies';
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

test('every policy message reads back to its policy', () => {
  for (const policy of POLICY_IDS) {
    expect(policyOf('lint/rule', policyMessage(policy))).toBe(policy);
  }
});

describe('policyTag reads the bracketed tag of a message, a scoped module included', () => {
  for (const [message, id] of [
    ['[module/@shopify/flash-list] une liste virtualisée', 'module/@shopify/flash-list'],
    ['[module/@expo/ui] un contrôle natif', 'module/@expo/ui'],
    ['[module/react-native] une vue', 'module/react-native'],
    ['[hermes/intl-plural-rules] une API absente', 'hermes/intl-plural-rules'],
    ['[import/primitive] une place', 'import/primitive'],
  ] as const) {
    test(message, () => {
      expect(policyTag(message)).toBe(id);
    });
  }

  test('a message without brackets names no policy', () => {
    expect(policyTag('rien à lire ici')).toBeNull();
  });
});
