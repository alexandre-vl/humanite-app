import type { ProofId } from './fixtures/proofs.ts';
import type { Bindings } from './model.ts';

/**
 * How each binding rule of each ADR is proven, and the paths each ADR governs. ADR files are frozen once decided;
 * this file follows the code instead. `adr/bindings` keeps it in step with the rules written in the ADRs.
 */
export const BINDINGS = {} as const satisfies Bindings<ProofId>;
