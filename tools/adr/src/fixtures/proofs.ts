import { ADR_FIXTURES } from './registry.ts';
import { LIFECYCLE_FIXTURES } from './lifecycle.ts';

/** Every fixture that can prove a rule; its id is what `tools/adr/src/bindings.ts` points at. */
export const PROOFS = [...ADR_FIXTURES, ...LIFECYCLE_FIXTURES] as const;

export type ProofId = (typeof PROOFS)[number]['id'];
