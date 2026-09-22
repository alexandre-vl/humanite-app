import { SECRET_FIXTURES } from './secrets.ts';

/** Every capture fixture that can prove a rule; bindings point at their ids. */
export const CAPTURE_PROOFS = [...SECRET_FIXTURES] as const;
