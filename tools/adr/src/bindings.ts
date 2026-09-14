import type { ProofId } from './fixtures/proofs.ts';
import type { Bindings } from './model.ts';

/**
 * How each binding rule of each ADR is proven, and the paths each ADR governs. ADR files are frozen once decided;
 * this file follows the code instead. `adr/bindings` keeps it in step with the rules written in the ADRs.
 */
export const BINDINGS = {
  'ADR-0000': {
    scope: ['docs/adr/**', 'tools/adr/**', 'tools/fixtures/**', '.claude/settings.json'],
    rules: {
      R1: [
        'adr/valid',
        'adr/path',
        'adr/encoding',
        'adr/frontmatter-yaml',
        'adr/frontmatter-schema',
        'adr/frontmatter-canonical',
        'adr/markdown-subset',
        'adr/title',
        'adr/slug',
        'adr/sections',
        'adr/words',
        'adr/valid-words-limit',
        'adr/link-target',
      ],
      R2: [
        'adr/context',
        'adr/criteria',
        'adr/options',
        'adr/decision',
        'adr/valence',
        'adr/criteria-cited',
        'adr/reevaluation',
      ],
      R3: ['adr/keywords'],
      R4: ['adr/number-unique', 'adr/no-deletion', 'new/parallel-worktrees', 'new/unlocked-race'],
      R5: ['adr/transitions', 'decide/uncommitted-refused', 'decide/rejects'],
      R6: ['adr/frozen', 'adr/frozen-renamed', 'adr/history', 'adr/valid-accepted', 'adr/valid-code-block-status'],
      R7: [
        'guard/decided-write',
        'guard/status-change',
        'guard/new-decided-file',
        'guard/decide-command',
        'guard/proposed-edit',
        'guard/other-file',
        'decide/agent-refused',
        'hook/settings-wired',
        'hook/settings-without-bash',
      ],
      R8: [
        'adr/bindings',
        'adr/scope',
        'adr/accept-proofs',
        'adr/valid-staged-acceptance',
        'decide/failing-proof-refused',
        'decide/accepts',
      ],
      R9: ['adr/index'],
      R10: ['adr/references', 'adr/valid-superseded'],
    },
  },
} as const satisfies Bindings<ProofId>;
