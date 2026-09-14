import { isOneOf } from '@huma/kit/records';

/** Why a change deserves an ADR, in the canonical order of the `significance` field. */
export const SIGNIFICANCES = ['dependency', 'guarded-config', 'boundary', 'data-format', 'reversal-cost'] as const;

export type Significance = (typeof SIGNIFICANCES)[number];

export const isSignificance = (value: string): value is Significance => isOneOf(SIGNIFICANCES, value);

/** `automatic` criteria can be detected from a diff; `review` ones only by reading the change. */
export const SIGNIFICANCE = {
  dependency: { label: 'ajoute, retire ou remplace une dépendance', detection: 'automatic' },
  'guarded-config': {
    label: 'modifie une configuration que les outils du dépôt font respecter',
    detection: 'automatic',
  },
  boundary: {
    label: 'crée ou déplace une frontière : couche, paquet, champs exports ou imports',
    detection: 'automatic',
  },
  'data-format': { label: 'change un contrat de données ou un format persistant', detection: 'automatic' },
  'reversal-cost': { label: 'coûte plus d’une journée à défaire', detection: 'review' },
} as const satisfies Readonly<Record<Significance, Readonly<{ label: string; detection: 'automatic' | 'review' }>>>;
