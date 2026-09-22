import { ADR_PROOFS } from '@huma/adr/proofs';
import { AGENT_PROOFS } from '@huma/agents/proofs';
import { CAPTURE_PROOFS } from '@huma/capture/proofs';
import { DEPS_PROOFS } from '@huma/deps/proofs';
import { EMULATOR_PROOFS } from '@huma/emulator/proofs';
import { EXPO_PROOFS } from '@huma/expo/proofs';
import type { Fixture } from '@huma/fixtures';
import { runFixture } from '@huma/fixtures';
import { GIT_HOOK_PROOFS } from '@huma/git-hooks/proofs';
import { GUARDRAIL_PROOFS } from '@huma/guardrails/proofs';
import { LINT_PROOFS } from '@huma/lint/proofs';
import { PERF_PROOFS } from '@huma/perf/proofs';
import { STRUCTURE_PROOFS } from '@huma/structure/proofs';
import { COMMIT_HISTORY_FIXTURES } from './proofs/commit-history.ts';
import { COMMIT_REFS_FIXTURES } from './proofs/commit-refs.ts';
import { GOVERNANCE_FIXTURES } from './proofs/governance.ts';

type IdOf<Fixtures extends readonly Fixture<string, string>[]> = Fixtures[number]['id'];

/** The id of every fixture of the workspace that can prove a rule, as the bindings name them. */
export type ProofId =
  | IdOf<typeof ADR_PROOFS>
  | IdOf<typeof AGENT_PROOFS>
  | IdOf<typeof CAPTURE_PROOFS>
  | IdOf<typeof DEPS_PROOFS>
  | IdOf<typeof EMULATOR_PROOFS>
  | IdOf<typeof EXPO_PROOFS>
  | IdOf<typeof GIT_HOOK_PROOFS>
  | IdOf<typeof GUARDRAIL_PROOFS>
  | IdOf<typeof LINT_PROOFS>
  | IdOf<typeof PERF_PROOFS>
  | IdOf<typeof STRUCTURE_PROOFS>
  | IdOf<typeof GOVERNANCE_FIXTURES>
  | IdOf<typeof COMMIT_HISTORY_FIXTURES>
  | IdOf<typeof COMMIT_REFS_FIXTURES>;

/**
 * Every list of fixtures of the workspace. Its element type is what makes the union above answer for it: a list added
 * here whose ids `ProofId` does not hold stops compiling. The two cannot be one — a tuple of these tuples exceeds what
 * the compiler will serialize for a declaration (TS7056) — but neither can drift without saying so.
 */
const PROOF_LISTS: readonly (readonly Fixture<ProofId, string>[])[] = [
  ADR_PROOFS,
  AGENT_PROOFS,
  CAPTURE_PROOFS,
  DEPS_PROOFS,
  EMULATOR_PROOFS,
  EXPO_PROOFS,
  GIT_HOOK_PROOFS,
  GUARDRAIL_PROOFS,
  LINT_PROOFS,
  PERF_PROOFS,
  STRUCTURE_PROOFS,
  GOVERNANCE_FIXTURES,
  COMMIT_HISTORY_FIXTURES,
  COMMIT_REFS_FIXTURES,
];

/** Every fixture of the workspace that can prove a rule; the bindings point at their ids. */
export const PROOFS: readonly Fixture<ProofId, string>[] = PROOF_LISTS.flatMap(
  (list): readonly Fixture<ProofId, string>[] => list,
);

export const PROOF_IDS: ReadonlySet<string> = new Set(PROOFS.map((fixture) => fixture.id));

/** Runs the fixture behind a proof id; an unknown id never passes. */
export async function runProof(id: string): Promise<boolean> {
  const fixture = PROOFS.find((candidate) => candidate.id === id);
  return fixture !== undefined && (await runFixture(fixture)).outcome === 'passed';
}
