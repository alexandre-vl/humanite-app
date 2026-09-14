import { CHECK_FIXTURES } from './checks.ts';
import { LIFECYCLE_FIXTURES } from './lifecycle.ts';

/** Every fixture of the ADR tool that can prove a rule; bindings point at their ids. */
export const ADR_PROOFS = [...CHECK_FIXTURES, ...LIFECYCLE_FIXTURES] as const;

export type AdrProofId = (typeof ADR_PROOFS)[number]['id'];
