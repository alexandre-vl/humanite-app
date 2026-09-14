import type { Diagnostic, Position } from '@huma/kit/diagnostics';
import { diagnostic, START } from '@huma/kit/diagnostics';
import type { MessageDetails } from '@huma/kit/messages';
import { renderMessage } from '@huma/kit/messages';
import type { RepoPath } from '@huma/kit/paths';

/** Findings of the workspace checks that no single tool owns. Each code is proven by a governance fixture. */
export const GOVERNANCE_CHECKS = {
  'gen/missing': {
    summary: 'chaque fichier dérivé existe',
    message: 'fichier dérivé absent : lancer pnpm gen',
  },
  'gen/stale': {
    summary: 'chaque fichier dérivé est identique à sa source',
    message: 'fichier dérivé périmé à partir de la ligne {line} : lancer pnpm gen',
  },
} as const satisfies Readonly<Record<string, Readonly<{ summary: string; message: string }>>>;

export type GovernanceCode = keyof typeof GOVERNANCE_CHECKS;

export const governanceFinding = <Code extends GovernanceCode>(
  code: Code,
  path: RepoPath,
  details: MessageDetails<(typeof GOVERNANCE_CHECKS)[Code]['message']>,
  position: Position = START,
): Diagnostic<Code> => diagnostic(code, path, position, renderMessage(code, GOVERNANCE_CHECKS[code].message, details));
