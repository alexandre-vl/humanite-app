import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/** Findings of the workspace checks that no single tool owns. Each code is proven by a governance fixture. */
const TABLE = {
  'gen/missing': {
    summary: 'chaque fichier dérivé existe',
    message: 'fichier dérivé absent : lancer pnpm gen',
  },
  'gen/stale': {
    summary: 'chaque fichier dérivé est identique à sa source',
    message: 'fichier dérivé périmé à partir de la ligne {line} : lancer pnpm gen',
  },
} as const;

export const GOVERNANCE_CHECKS = defineChecks(TABLE);

export type GovernanceCode = CheckCodeOf<typeof TABLE>;

export const governanceFinding = GOVERNANCE_CHECKS.finding;
