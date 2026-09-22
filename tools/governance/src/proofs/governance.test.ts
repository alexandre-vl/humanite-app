import type { Bindings } from '@huma/adr/bindings';
import { proofsOf } from '@huma/adr/bindings';
import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expect, expectTypeOf, test } from 'vitest';
import { BINDINGS } from '../bindings.ts';
import { PROOFS } from '../proofs.ts';
import type { GovernanceProofCode } from './governance.ts';
import { GOVERNANCE_FIXTURES } from './governance.ts';

test('every governance code is reached by a fixture', () => {
  expectTypeOf<Coverage<GovernanceProofCode, typeof GOVERNANCE_FIXTURES>>().toEqualTypeOf<true>();
});

/** The only place proof ids are proven unique: every list of the workspace ends up in `PROOFS`. */
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
  'agent/git-absolute-path',
  'agent/shell-absolute-path',
  'agent/wrapper-absolute-path',
  'agent/valid-substituted-argument',
  'agent/sudo',
  'agent/sudo-wrapped',
  'agent/sudo-absolute-path',
  'agent/sudo-substituted-name',
  'agent/su-command',
  'agent/doas',
  'agent/pkexec',
  'agent/su',
  'agent/run0',
  'agent/emulator-run',
  'agent/emulator-remove',
  'agent/emulator-exec',
  'agent/emulator-container-command',
  'agent/emulator-inspect',
  'agent/emulator-script',
  'agent/hooks-directory',
  'agent/verify-stamp-forged',
  'agent/valid-remove-verify-stamp',
  'agent/shell-chmod-hook',
  'agent/shell-unknown-directory',
  'agent/shell-partly-known-path',
  'agent/shell-write-source',
  'agent/shell-error-log',
  'agent/shell-unknown-file',
  'agent/edit-git-config',
  'agent/write-source',
  'agent/setpriv',
  'agent/capsh',
  'agent/nsenter',
  'agent/machinectl',
  'agent/sg-group',
  'agent/newgrp',
  'agent/runuser',
  'agent/systemd-run-root',
  'agent/valid-systemd-run-user',
  'agent/unshare-hides-commit',
  'agent/strace-hides-commit',
  'agent/setarch-hides-sudo',
  'agent/script-hides-commit',
  'agent/parallel-hides-commit',
  'agent/proxychains-hides-commit',
  'agent/rlwrap-hides-decide',
  'agent/ssh-hides-commit',
  'agent/flock-option-hides-commit',
  'agent/setarch-option-hides-commit',
  'agent/ssh-option-hides-commit',
  'agent/valid-unshare-read',
  'agent/valid-ssh-listing',
  'agent/emulator-podman',
  'agent/emulator-nerdctl',
  'agent/emulator-compose',
  'agent/emulator-compose-tool',
  'agent/emulator-runtime',
  'agent/emulator-network',
  'agent/emulator-volume',
  'agent/emulator-image',
  'agent/valid-compose-listing',
  'agent/valid-other-container',
  'agent/include-path-option',
  'agent/include-path-config',
  'agent/git-index-variable',
  'agent/hash-object',
  'agent/symbolic-ref',
  'agent/update-index',
  'agent/read-tree',
  'agent/filter-branch',
  'agent/filter-repo',
  'agent/valid-git-stash',
  'agent/valid-git-reset',
  'agent/valid-git-worktree',
  'agent/valid-git-config-read',
  'agent/python-decides',
  'agent/perl-decides',
  'agent/ruby-decides',
  'agent/deno-eval-decides',
  'agent/chroot',
  'agent/valid-python-read',
  'claude-hook/stop-unverifiable-blocks',
  'claude-hook/stop-unverifiable-once',
];

/** Whether a proof answers for something other than the ADR process: the colours the paper is read at, the visuals it draws, dependencies, Expo, git hooks, guardrails, lint, performance budgets, the prose it reads, the root guard, the secrets a capture must not carry and the structure, plus the agent proofs above. */
const awaitsFoundationAdr = (id: string): boolean =>
  [
    'artwork/',
    'deps/',
    'emulator/',
    'expo/',
    'git/',
    'guardrail/',
    'legibility/',
    'lint/',
    'perf/',
    'prose/',
    'root/',
    'secret/',
    'structure/',
  ].some((prefix) => id.startsWith(prefix)) || AWAITING_FOUNDATION_ADRS.includes(id);

test('every proof that touches an ADR is bound to a rule of ADR-0000; the others await the ADRs of the foundations', () => {
  const bound = new Set<string>(Object.values(BINDINGS['ADR-0000'].rules).flat());
  const ids = PROOFS.map((fixture) => fixture.id);
  expect(ids.filter((id) => !bound.has(id))).toEqual(ids.filter(awaitsFoundationAdr));
});

/**
 * The reverse of "a rule exists only if a tool proves it": every proof that proves a code fires is bound to a rule of
 * some ADR. Only the agent-guard and Stop-hook proofs may stay unbound — ADR-0009 cites representatives and the Stop
 * hook has no ADR yet — so a new enforcing proof under any other prefix cannot ship without an ADR.
 */
test('every enforcing proof is bound to an ADR, save the agent-guard and Stop-hook proofs awaiting theirs', () => {
  const allBindings: Bindings = BINDINGS;
  const bound = new Set<string>(Object.values(allBindings).flatMap((binding) => proofsOf(binding)));
  const unbound = PROOFS.filter((fixture) => fixture.expected.length > 0 && !bound.has(fixture.id)).map(
    (fixture) => fixture.id,
  );
  const awaiting = unbound.filter((id) => id.startsWith('agent/') || id.startsWith('claude-hook/'));
  expect(unbound.toSorted((left, right) => left.localeCompare(right))).toEqual(
    awaiting.toSorted((left, right) => left.localeCompare(right)),
  );
});

testFixtures('each governance fixture reports exactly its expected codes', GOVERNANCE_FIXTURES);
