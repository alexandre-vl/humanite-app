import type { Fixture } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { POLICY_IDS } from '@huma/eslint-config/policies';

/** Every policy: the configuration a fixture proves its policies against. */
export const ALL_POLICIES: ReadonlySet<PolicyId> = new Set(POLICY_IDS);

/** A family of fixtures, built for a set of enabled policies. */
export type PolicyFixtures = (enabled: ReadonlySet<PolicyId>) => readonly Fixture<string, PolicyId>[];

/** The fixtures of a family that expect `policy`, built with every other policy: each must then miss `policy`. */
export const mutantsOf = (fixtures: PolicyFixtures, policy: PolicyId): readonly Fixture<string, PolicyId>[] =>
  fixtures(new Set(POLICY_IDS.filter((id) => id !== policy))).filter((fixture) => fixture.expected.includes(policy));
