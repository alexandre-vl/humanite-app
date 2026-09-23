import type { Fixture } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { APP_FIXTURES, appMutants } from './app.ts';
import { HERMES_FIXTURES, hermesMutants } from './hermes.ts';
import { NODE_TOOL_FIXTURES, nodeToolMutants } from './node-tool.ts';
import { UNKNOWN_FIXTURES, unknownMutants } from './unknown.ts';

/** Every fixture of the lint policies, linted with every policy. */
export const POLICY_FIXTURES = [
  ...NODE_TOOL_FIXTURES,
  ...APP_FIXTURES,
  ...HERMES_FIXTURES,
  ...UNKNOWN_FIXTURES,
] as const;

/** The fixtures that expect `policy`, linted with every other policy: each must then miss exactly `policy`. */
export const policyMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] => [
  ...nodeToolMutants(policy),
  ...appMutants(policy),
  ...hermesMutants(policy),
  ...unknownMutants(policy),
];
