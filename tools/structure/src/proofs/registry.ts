import { STRUCTURE_FIXTURES } from './structure.ts';

/** Every fixture of the structure checks that can prove a rule; bindings point at their ids. */
export const STRUCTURE_PROOFS = [...STRUCTURE_FIXTURES] as const;

export type StructureProofId = (typeof STRUCTURE_PROOFS)[number]['id'];
