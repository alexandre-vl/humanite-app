import { ADR_PROOFS } from '@huma/adr/proofs';
import { AGENT_FIXTURES } from '@huma/agents/proofs';
import { runFixture } from '@huma/fixtures';
import { GOVERNANCE_FIXTURES } from './proofs/governance.ts';

/** Every fixture of the workspace that can prove a rule; the bindings point at their ids. */
export const PROOFS = [...ADR_PROOFS, ...AGENT_FIXTURES, ...GOVERNANCE_FIXTURES] as const;

export type ProofId = (typeof PROOFS)[number]['id'];

export const PROOF_IDS: ReadonlySet<string> = new Set(PROOFS.map((fixture) => fixture.id));

/** Runs the fixture behind a proof id; an unknown id never passes. */
export async function runProof(id: string): Promise<boolean> {
  const fixture = PROOFS.find((candidate) => candidate.id === id);
  return fixture !== undefined && (await runFixture(fixture)).outcome === 'passed';
}
