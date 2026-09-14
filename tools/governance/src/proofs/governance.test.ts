import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
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

/** Proofs no ADR binds yet: git hooks, root commands, the Stop hook and writes that touch no ADR. */
const AWAITING_FOUNDATION_ADRS = [
  'agent/no-verify',
  'agent/no-verify-abbreviated',
  'agent/short-n-cluster',
  'agent/no-verify-split-string',
  'agent/no-verify-ansi-quoted',
  'agent/no-verify-braces',
  'agent/no-verify-ifs',
  'agent/no-verify-variable',
  'agent/no-verify-unknown-subcommand',
  'agent/no-verify-function',
  'agent/no-verify-heredoc-shell',
  'agent/no-verify-find-exec',
  'agent/message-with-n',
  'agent/commit-message-heredoc',
  'agent/log-n',
  'agent/grep-no-verify',
  'agent/hooks-path-option',
  'agent/hooks-path-config',
  'agent/hooks-path-read',
  'agent/config-environment',
  'agent/alias-option',
  'agent/alias-config',
  'agent/work-tree-option',
  'agent/git-dir-variable',
  'agent/commit-tree',
  'agent/update-ref',
  'agent/fast-import',
  'agent/replace',
  'agent/merge-no-verify',
  'agent/rebase-no-verify',
  'agent/cherry-pick-no-verify',
  'agent/revert-no-verify',
  'agent/am-no-verify',
  'agent/pull-no-verify',
  'agent/push-no-verify',
  'agent/plain-commit',
  'agent/sudo',
  'agent/sudo-wrapped',
  'agent/doas',
  'agent/pkexec',
  'agent/su',
  'agent/run0',
  'agent/hooks-directory',
  'agent/shell-chmod-hook',
  'agent/shell-unknown-directory',
  'agent/shell-partly-known-path',
  'agent/shell-write-source',
  'agent/shell-error-log',
  'agent/shell-unknown-file',
  'agent/edit-git-config',
  'agent/write-source',
  'claude-hook/stop-unverifiable-blocks',
  'claude-hook/stop-unverifiable-once',
];

/** Whether a proof awaits an ADR of the foundations: every git hook proof, and the agent proofs listed above. */
const awaitsFoundationAdr = (id: string): boolean => id.startsWith('git/') || AWAITING_FOUNDATION_ADRS.includes(id);

test('every proof that touches an ADR is bound to a rule of ADR-0000; the others await the ADRs of the foundations', () => {
  const bound = new Set<string>(Object.values(BINDINGS['ADR-0000'].rules).flat());
  const ids = PROOFS.map((fixture) => fixture.id);
  expect(ids.filter((id) => !bound.has(id))).toEqual(ids.filter(awaitsFoundationAdr));
});

describe.concurrent('each governance fixture reports exactly its expected codes', () => {
  test.each(GOVERNANCE_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
