import { POLICY_FIXTURES } from './policies.ts';

/** Every guardrail fixture that can prove a rule; bindings point at their ids. */
export const GUARDRAIL_PROOFS = [...POLICY_FIXTURES] as const;

export type GuardrailProofId = (typeof GUARDRAIL_PROOFS)[number]['id'];
