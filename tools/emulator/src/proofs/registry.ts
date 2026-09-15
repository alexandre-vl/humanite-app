import { ROOT_FIXTURES } from './root.ts';

/** Every fixture of the emulator that can prove a rule; bindings point at their ids. */
export const EMULATOR_PROOFS = [...ROOT_FIXTURES] as const;
