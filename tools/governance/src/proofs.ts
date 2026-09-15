import { ADR_PROOFS } from '@huma/adr/proofs';
import { AGENT_PROOFS } from '@huma/agents/proofs';
import { DEPS_PROOFS } from '@huma/deps/proofs';
import { EMULATOR_PROOFS } from '@huma/emulator/proofs';
import { EXPO_PROOFS } from '@huma/expo/proofs';
import { runFixture } from '@huma/fixtures';
import { GIT_HOOK_PROOFS } from '@huma/git-hooks/proofs';
import { GUARDRAIL_PROOFS } from '@huma/guardrails/proofs';
import { LINT_PROOFS } from '@huma/lint/proofs';
import { STRUCTURE_PROOFS } from '@huma/structure/proofs';
import { COMMIT_REFS_FIXTURES } from './proofs/commit-refs.ts';
import { GOVERNANCE_FIXTURES } from './proofs/governance.ts';

/** Every fixture of the workspace that can prove a rule; the bindings point at their ids. */
export const PROOFS = [
  ...ADR_PROOFS,
  ...AGENT_PROOFS,
  ...DEPS_PROOFS,
  ...EMULATOR_PROOFS,
  ...EXPO_PROOFS,
  ...GIT_HOOK_PROOFS,
  ...GUARDRAIL_PROOFS,
  ...LINT_PROOFS,
  ...STRUCTURE_PROOFS,
  ...GOVERNANCE_FIXTURES,
  ...COMMIT_REFS_FIXTURES,
] as const;

export type ProofId = (typeof PROOFS)[number]['id'];

export const PROOF_IDS: ReadonlySet<string> = new Set(PROOFS.map((fixture) => fixture.id));

/** Runs the fixture behind a proof id; an unknown id never passes. */
export async function runProof(id: string): Promise<boolean> {
  const fixture = PROOFS.find((candidate) => candidate.id === id);
  return fixture !== undefined && (await runFixture(fixture)).outcome === 'passed';
}
