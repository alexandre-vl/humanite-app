import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/**
 * Findings of `pnpm structure:check`: the Feature-Sliced heuristics Steiger owns, which boundaries cannot express,
 * the import cycles dependency-cruiser finds, and what a build reading the service would bundle.
 */
const TABLE = {
  'structure/ambiguous-slice-names': {
    summary: 'aucun slice ne porte le nom d’un segment de shared',
    message: '{text}',
  },
  'structure/excessive-slicing': {
    summary: 'une couche ne compte pas trop de slices non groupés',
    message: '{text}',
  },
  'structure/import-locality': {
    summary: 'un slice s’importe lui-même en relatif et importe les autres par leur alias',
    message: '{text}',
  },
  'structure/inconsistent-naming': {
    summary: 'les entités se nomment toutes au singulier ou toutes au pluriel',
    message: '{text}',
  },
  'structure/insignificant-slice': {
    summary: 'un slice sert à plusieurs autres : sinon il vit dans le seul qui l’emploie',
    message: '{text}',
  },
  'structure/no-reserved-folder-names': {
    summary: 'aucun dossier d’un segment ne porte le nom d’un segment',
    message: '{text}',
  },
  'structure/repetitive-naming': {
    summary: 'les slices d’une couche ne répètent pas le même mot',
    message: '{text}',
  },
  'structure/shared-lib-grouping': {
    summary: 'shared/lib ne compte pas trop de modules non groupés',
    message: '{text}',
  },
  'structure/cycle': {
    summary: 'aucun cycle d’imports dans le code de l’app',
    message: 'cycle d’imports : {cycle}',
  },
  'structure/source-variant': {
    summary: 'une variante de service ne vit que dans une place qui les permet, la place api',
    message:
      'variante de service hors de la place api : une build de service la prendrait pour le module qu’elle double',
  },
  'structure/service-corpus': {
    summary: 'une build qui lit le service n’embarque rien du corpus simulé',
    message: 'la build de service embarque {module}',
  },
} as const;

export const STRUCTURE_CHECKS = defineChecks(TABLE);

export type StructureCode = CheckCodeOf<typeof TABLE>;

export const structureFinding = STRUCTURE_CHECKS.finding;
