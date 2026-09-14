import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/** Findings of `pnpm lint` and `pnpm format:check` over the files of the repository. */
const TABLE = {
  'lint/rule': {
    summary: 'aucune règle ESLint ne signale le code',
    message: '{rule} : {text}',
  },
  'lint/parse-error': {
    summary: 'ESLint lit chaque fichier qu’il vérifie',
    message: 'fichier illisible pour ESLint : {text}',
  },
  'lint/inline-config': {
    summary: 'aucun commentaire ne configure ESLint dans le code',
    message: '{text} : la configuration vit dans eslint.config.ts, jamais dans le code',
  },
  'lint/suppressed': {
    summary: 'aucun problème signalé par ESLint n’est mis en sourdine',
    message: '{rule} mis en sourdine : {text}',
  },
  'lint/suppressions-file': {
    summary: 'aucun fichier de suppressions ESLint dans le dépôt',
    message: 'fichier de suppressions ESLint : corriger les problèmes au lieu de les taire',
  },
  'lint/unconfigured': {
    summary: 'chaque fichier qu’ESLint vérifie a des règles actives',
    message: 'ESLint vérifie ce fichier sans aucune règle : lui donner une configuration ou changer son extension',
  },
  'lint/deprecated-rule': {
    summary: 'la configuration n’active aucune règle ESLint dépréciée',
    message: 'règle dépréciée {rule} active : la retirer ou la remplacer',
  },
  'lint/unformatted': {
    summary: 'chaque fichier que Prettier formate est formaté',
    message: 'fichier non formaté : lancer pnpm format',
  },
  'lint/format-error': {
    summary: 'Prettier lit chaque fichier qu’il formate',
    message: 'fichier illisible pour Prettier : {text}',
  },
} as const;

export const LINT_CHECKS = defineChecks(TABLE);

export type LintCode = CheckCodeOf<typeof TABLE>;

export const lintFinding = LINT_CHECKS.finding;
