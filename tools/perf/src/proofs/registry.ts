import { PERF_FIXTURES } from './perf.ts';

/** Every fixture of the performance budgets that can prove a rule; bindings point at their ids. */
export const PERF_PROOFS = [...PERF_FIXTURES] as const;
