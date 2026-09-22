import { ARTWORK_FIXTURES } from './artwork.ts';
import { LEGIBILITY_FIXTURES } from './legibility.ts';
import { PICTURE_FIXTURES } from './picture.ts';
import { POLICY_FIXTURES } from './policies.ts';
import { PROSE_FIXTURES } from './prose.ts';

/** Every guardrail fixture that can prove a rule; bindings point at their ids. */
export const GUARDRAIL_PROOFS = [
  ...POLICY_FIXTURES,
  ...LEGIBILITY_FIXTURES,
  ...ARTWORK_FIXTURES,
  ...PROSE_FIXTURES,
  ...PICTURE_FIXTURES,
] as const;
