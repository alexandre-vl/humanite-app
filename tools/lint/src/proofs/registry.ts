import { LINT_FIXTURES } from './lint.ts';

/** Every fixture of the lint and format runners that can prove a rule; bindings point at their ids. */
export const LINT_PROOFS = [...LINT_FIXTURES] as const;
