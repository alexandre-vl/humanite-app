import { DEPS_FIXTURES } from './deps.ts';

/** Every fixture of the dependency checks that can prove a rule; bindings point at their ids. */
export const DEPS_PROOFS = [...DEPS_FIXTURES] as const;

export type DepsProofId = (typeof DEPS_PROOFS)[number]['id'];
