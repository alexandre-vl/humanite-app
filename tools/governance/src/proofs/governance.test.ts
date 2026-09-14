import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { BINDINGS } from '../bindings.ts';
import { PROOFS } from '../proofs.ts';
import type { GovernanceProofCode } from './governance.ts';
import { GOVERNANCE_FIXTURES } from './governance.ts';

test('every governance code is reached by a fixture', () => {
  expectTypeOf<Coverage<GovernanceProofCode, typeof GOVERNANCE_FIXTURES>>().toEqualTypeOf<true>();
});

test('proof ids are unique across the whole workspace', () => {
  expect(findDuplicateIds(PROOFS)).toEqual([]);
});

test('every proof of the ADR process is bound to a rule of ADR-0000, except the lifecycle helpers', () => {
  const bound = new Set<string>(Object.values(BINDINGS['ADR-0000'].rules).flat());
  const unbound = PROOFS.map((fixture) => fixture.id).filter((id) => !bound.has(id));
  expect(unbound).toEqual([
    'adr/valid-history',
    'adr/valid-renamed-proposed',
    'guard/proposed-edit',
    'agent/decide-mentioned',
    'agent/adr-check',
    'agent/no-verify',
    'agent/no-verify-abbreviated',
    'agent/short-n-cluster',
    'agent/message-with-n',
    'agent/log-n',
    'agent/hooks-path-option',
    'agent/hooks-path-config',
    'agent/config-environment',
    'agent/commit-tree',
    'agent/hooks-directory',
    'agent/push-no-verify',
    'agent/plain-commit',
    'agent/sudo',
    'agent/sudo-wrapped',
    'agent/edit-git-config',
    'agent/write-settings',
    'agent/write-source',
    'agent/write-outside',
    'agent/proposed-edit',
    'agent/other-tool',
    'hook/settings-command-allows',
    'hook/failure-allows-innocuous',
  ]);
});

describe.concurrent('each governance fixture reports exactly its expected codes', () => {
  test.each(GOVERNANCE_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    60_000,
  );
});
