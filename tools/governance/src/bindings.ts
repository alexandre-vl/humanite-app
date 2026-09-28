import type { Bindings } from '@huma/adr/bindings';
import { repoPath } from '@huma/kit/paths';
import type { ProofId } from './proofs.ts';

/** Where the bindings live, as the index and the diagnostics name them. */
export const BINDINGS_PATH = repoPath('tools/governance/src/bindings.ts');

/**
 * How each binding rule of each ADR is proven, and what each ADR governs. ADR files are frozen once decided; this file
 * follows the code instead, and `adr:check` keeps it in step with the rules written in the ADRs.
 */
export const BINDINGS = {
  'ADR-0000': {
    scope: {
      paths: [
        'docs/adr/**',
        'tools/adr/**',
        'tools/agents/src/guard.ts',
        'tools/governance/src/acknowledgments.ts',
        'tools/governance/src/bindings.ts',
        'tools/governance/src/bindings-file.ts',
        'tools/governance/src/cli/adr-check.ts',
        'tools/governance/src/cli/adr-decide.ts',
        'tools/governance/src/cli/adr-new.ts',
        'tools/governance/src/cli/adr-status.ts',
        'tools/governance/src/commit-refs.ts',
        'tools/governance/src/decision.ts',
        'tools/governance/src/proofs/commit-refs.ts',
        'tools/governance/src/workspace.ts',
      ],
    },
    rules: {
      R1: [
        'adr/valid',
        'adr/valid-words-limit',
        'adr/valid-nbsp',
        'adr/valid-link-target',
        'adr/valid-root-link-target',
        'adr/encoding-invalid-utf8',
        'adr/encoding-bom',
        'adr/encoding-not-nfc',
        'adr/encoding-invisible',
        'adr/encoding-invisible-crlf',
        'adr/frontmatter-missing',
        'adr/frontmatter-yaml',
        'adr/frontmatter-schema',
        'adr/frontmatter-not-canonical',
        'adr/frontmatter-not-canonical-delimiter',
        'adr/markdown-node',
        'adr/markdown-heading-depth',
        'adr/markdown-task-list',
        'adr/markdown-link-title',
        'adr/markdown-indented-code',
        'adr/markdown-code-language',
        'adr/title-missing',
        'adr/title-not-first',
        'adr/title-duplicate',
        'adr/title-rich',
        'adr/title-no-letter',
        'adr/title-too-long',
        'adr/title-forbidden-character',
        'adr/title-final-punctuation',
        'adr/slug-mismatch',
        'adr/section-content-before',
        'adr/section-order',
        'adr/section-subsection',
        'adr/section-consequences',
        'adr/section-pros-and-cons-text',
        'adr/words-limit',
        'adr/link-scheme',
        'adr/link-malformed',
        'adr/link-empty',
        'adr/link-scheme-protocol-relative',
        'adr/link-target-missing',
        'adr/mention-malformed',
        'adr/mention-unknown',
        'adr/path-directory',
        'adr/path-name',
        'new/title-refused',
      ],
      R2: ['adr/frontmatter-format-unknown', 'adr/frontmatter-format-outdated', 'adr/format-regression'],
      R3: [
        'adr/context-question-missing',
        'adr/context-question-shape',
        'adr/valid-question-code',
        'adr/context-facts-missing',
        'adr/context-fact-shape',
        'adr/context-fact-unsourced',
        'adr/context-fact-fragment-only',
        'adr/context-stray-block',
        'adr/criteria-list',
        'adr/criteria-label',
        'adr/options-list',
        'adr/options-name',
        'adr/options-duplicate',
        'adr/options-too-few',
        'adr/options-subsections',
        'adr/decision-chosen-shape',
        'adr/decision-chosen-unknown',
        'adr/decision-chosen-duplicate',
        'adr/decision-rules-missing',
        'adr/decision-rule-label',
        'adr/decision-trailing-block',
        'adr/decision-no-binding-rule',
        'adr/argument-list',
        'adr/argument-shape',
        'adr/consequences-balance',
        'adr/option-chosen-without-good',
        'adr/option-rejected-without-bad',
        'adr/citation-malformed',
        'adr/citation-unknown',
        'adr/citation-chosen-missing',
        'adr/citation-argument-missing',
        'adr/citation-criterion-unused',
        'adr/reevaluation-list',
        'adr/reevaluation-count',
      ],
      R4: [
        'adr/keyword-forbidden',
        'adr/keyword-forbidden-unaccented',
        'adr/keyword-negation',
        'adr/keyword-negation-may',
        'adr/keyword-negation-without-ne',
        'adr/keyword-forbidden-hyphenated',
        'adr/keyword-count',
        'adr/keyword-outside-rule',
      ],
      R5: [
        'adr/number-duplicate',
        'adr/deleted',
        'adr/number-reused',
        'adr/valid-restored',
        'adr/number-duplicate-keeps-lineage',
        'new/parallel-worktrees',
        'new/unreserved-race',
        'new/reserved-number-skipped',
        'new/parallel-creations',
        'new/abandoned-number-kept',
      ],
      R6: [
        'adr/transition-first-not-proposed',
        'adr/transition-forbidden',
        'adr/transition-uncommitted',
        'decide/failing-checks-refused',
        'decide/unknown-adr-refused',
        'decide/stale-artifacts-refused',
        'decide/concurrent-change-refused',
        'decide/failing-result-undone',
        'decide/dirty-tree-refused',
        'decide/already-decided-refused',
        'adr/valid-merge-acceptance',
        'adr/decision-content-changed',
        'adr/decision-content-changed-staged',
        'decide/rejects',
        'decide/valid-message-accepted',
        'decide/valid-message-superseding',
      ],
      R7: [
        'adr/frozen-modified',
        'adr/frozen-after-unreadable',
        'adr/frozen-renamed',
        'adr/history-shallow',
        'adr/history-not-repository',
        'adr/valid-accepted',
        'adr/valid-code-block-status',
        'guard/decided-write',
        'format/prettier-keeps-fingerprint',
        'format/embedded-code-changes-fingerprint',
      ],
      R8: [
        'agent/decide-script',
        'agent/decide-run-script',
        'agent/decide-entry',
        'agent/decide-masked-session',
        'agent/decide-in-subshell',
        'agent/decide-in-substitution',
        'agent/decide-monitor',
        'agent/decide-relative-entry',
        'agent/decide-exec-runner',
        'agent/decide-eval-code',
        'agent/decide-mentioned',
        'agent/decide-source-read',
        'agent/adr-check',
        'agent/unset-session',
        'agent/empty-session',
        'agent/unexport-session',
        'agent/ignore-environment',
        'agent/status-edit',
        'agent/decided-edit',
        'agent/decided-multi-edit',
        'agent/proposed-edit-missing-text',
        'agent/relative-status-write',
        'agent/shell-sed-status',
        'agent/shell-sed-proposed',
        'agent/shell-cd-relative',
        'agent/shell-loop-pattern',
        'agent/shell-heredoc-decided',
        'agent/shell-append-decided',
        'agent/shell-remove-decided',
        'agent/shell-remove-proposed',
        'agent/shell-rename-decided',
        'agent/shell-copy-decided',
        'agent/shell-remove-tree',
        'agent/shell-find-delete',
        'agent/shell-find-refactor',
        'agent/shell-symlink-decided',
        'agent/write-outside',
        'agent/write-settings',
        'agent/write-local-settings',
        'agent/write-through-symlink',
        'agent/shell-local-settings',
        'agent/shell-home-settings',
        'agent/shell-tee-settings',
        'agent/unreadable-input',
        'agent/input-without-tool',
        'agent/shell-without-command',
        'agent/write-without-path',
        'agent/code-sensitive',
        'agent/code-innocuous',
        'agent/other-tool',
        'agent/valid-no-local-settings',
        'agent/valid-local-permissions',
        'agent/local-settings-hooks-disabled',
        'agent/local-settings-unreadable',
        'guard/status-change',
        'guard/new-decided-file',
        'guard/new-skeleton',
        'guard/tagged-status',
        'guard/escaped-status',
        'guard/non-canonical-proposed',
        'guard/escaped-decided-rewrite',
        'guard/unknown-result',
        'decide/agent-refused',
        'adr/decision-by-agent',
        'adr/decision-by-agent-worktree',
        'adr/valid-agent-merges-human-decision',
        'claude-hook/settings-command-denies',
        'claude-hook/settings-command-allows',
        'claude-hook/failure-denies-sensitive',
        'claude-hook/failure-allows-innocuous',
      ],
      R9: [
        'adr/binding-malformed-id',
        'adr/binding-unknown-adr',
        'adr/binding-inactive',
        'adr/binding-missing',
        'adr/binding-rule-unbound',
        'adr/binding-rule-extra',
        'adr/valid-optional-binding',
        'adr/binding-optional-only',
        'adr/binding-convention-empty',
        'adr/binding-proof-unknown',
        'adr/binding-no-proven-rule',
        'adr/scope-glob-invalid',
        'adr/scope-glob-duplicate',
        'adr/scope-glob-empty',
        'adr/accept-proof-failing',
        'adr/valid-staged-acceptance',
        'decide/failing-proof-refused',
        'decide/unbound-acceptance-refused',
        'decide/accepts',
      ],
      R10: ['gen/stale-index', 'gen/missing-index', 'gen/in-step'],
      R11: [
        'adr/supersedes-unknown',
        'adr/supersedes-newer',
        'adr/supersedes-not-accepted',
        'adr/supersedes-several',
        'adr/valid-superseded',
        'adr/decision-supersedes-added',
        'decide/accepts-superseding',
      ],
      R12: [
        'adr/valid-acknowledged',
        'adr/acknowledgment-unused',
        'adr/valid-frozen-acknowledged',
        'adr/frozen-acknowledged-then-edited',
      ],
      R13: [
        'adr/valid-history',
        'adr/valid-renamed-proposed',
        'guard/proposed-edit',
        'agent/proposed-edit',
        'agent/proposed-edit-straight-quotes',
        'agent/shell-heredoc-proposed',
        'agent/shell-rename-proposed',
        'agent/shell-copy-proposed',
      ],
    },
  },
  'ADR-0001': {
    scope: {
      paths: [
        'pnpm-workspace.yaml',
        'pnpm-lock.yaml',
        'package.json',
        'apps/*/package.json',
        'packages/*/package.json',
        'tools/*/package.json',
        'tools/deps/**',
        'tools/governance/src/cli/deps-check.ts',
      ],
    },
    rules: {
      R1: [
        'deps/catalog-missing',
        'deps/catalog-stale',
        'deps/catalog-unused',
        'deps/single-version',
        'deps/lockfile-version',
      ],
      R2: [
        'deps/catalog-range',
        'deps/sibling-version',
        'deps/single-instance',
        'deps/importer-stale',
        'deps/importer-missing',
        'deps/importer-extra',
        'deps/importer-unknown',
        'deps/private-copy',
        'deps/private-copy-allowed',
        'deps/private-copy-unused',
      ],
      R3: ['deps/tested-version', 'deps/untested-version'],
      R4: ['deps/specifier-form'],
      R5: ['deps/root-unknown', 'deps/root-dependency'],
      R6: ['deps/peer-undeclared'],
      R7: ['deps/policy-unknown'],
    },
  },
  'ADR-0002': {
    scope: {
      paths: [
        'apps/mobile/app.config.ts',
        'apps/mobile/app/**',
        'tools/expo/**',
        'tools/governance/src/cli/expo-types.ts',
      ],
    },
    rules: {
      R1: ['deps/tested-version', 'deps/untested-version'],
      R2: [
        'expo/routes-directory',
        'expo/tsconfig-rewrite',
        'expo/gitignore-rewrite',
        'expo/routes-invalid',
        'expo/typed-routes',
      ],
      R3: {
        convention:
          'Les invariants d’app.config sont vérifiés par tools/expo/src/app-config.test.ts, hors du banc de fixtures.',
      },
      R4: [
        'guardrail/hermes-array-from-async',
        'guardrail/hermes-array-to-sorted',
        'guardrail/hermes-crypto-get-random-values',
        'guardrail/hermes-crypto-random-uuid',
        'guardrail/hermes-finalization-registry',
        'guardrail/hermes-intl-display-names',
        'guardrail/hermes-intl-format-range',
        'guardrail/hermes-intl-list-format',
        'guardrail/hermes-intl-locale',
        'guardrail/hermes-intl-plural-rules',
        'guardrail/hermes-intl-plural-rules-destructured',
        'guardrail/hermes-intl-plural-rules-global-this',
        'guardrail/hermes-intl-relative-time-format',
        'guardrail/hermes-intl-segmenter',
        'guardrail/hermes-intl-supported-values-of',
        'guardrail/hermes-iterator-helpers',
        'guardrail/hermes-map-group-by',
        'guardrail/hermes-object-group-by',
        'guardrail/hermes-regexp-escape',
        'guardrail/hermes-regexp-v-flag',
        'guardrail/hermes-regexp-v-flag-call',
        'guardrail/hermes-regexp-v-flag-constructor',
        'guardrail/hermes-temporal',
        'guardrail/hermes-temporal-global-this',
      ],
    },
  },
  'ADR-0003': {
    scope: {
      paths: [
        'packages/tsconfig/**',
        'tsconfig.json',
        'apps/*/tsconfig.json',
        'packages/*/tsconfig.json',
        'tools/*/tsconfig.json',
        'tools/governance/src/tsconfig-snapshot.ts',
      ],
    },
    rules: {
      R1: ['deps/single-instance', 'deps/single-version'],
      R2: {
        convention:
          'Les options strictes de chaque projet sont vérifiées par tools/governance/src/tsconfig-snapshot.test.ts contre le préréglage packages/tsconfig/strict.json.',
      },
      R3: ['guardrail/node-import-js', 'guardrail/node-export-js', 'guardrail/node-dynamic-import-js'],
      R4: ['guardrail/node-decorator', 'guardrail/node-accessor'],
      R5: ['deps/reference-missing', 'deps/reference-undeclared'],
      R6: ['guardrail/node-process-exit'],
    },
  },
  'ADR-0004': {
    scope: {
      paths: [
        'packages/eslint-config/**',
        'tools/lint/**',
        'tools/governance/src/cli/lint.ts',
        'tools/governance/src/cli/format.ts',
        'tools/guardrails/src/effective-config.test.ts',
      ],
    },
    rules: {
      R1: ['lint/rule', 'lint/unconfigured', 'lint/parse-error', 'lint/git-ignored', 'lint/clean'],
      R2: ['lint/inline-config', 'lint/suppressed', 'lint/suppressions-file'],
      R3: ['lint/unformatted', 'lint/format-error', 'lint/prettier-ignored'],
      R4: {
        convention:
          'L’absence d’avertissement et le maintien à error des bans typés nommés sont vérifiés par tools/guardrails/src/effective-config.test.ts.',
      },
      R5: ['lint/deprecated-rule'],
    },
  },
  'ADR-0005': {
    scope: {
      paths: [
        'apps/mobile/app/**',
        'apps/mobile/src/**',
        'packages/architecture/**',
        'tools/structure/**',
        'tools/governance/src/cli/structure-check.ts',
      ],
    },
    rules: {
      R1: [
        'structure/ambiguous-slice-names',
        'structure/inconsistent-naming',
        'structure/insignificant-slice',
        'structure/no-reserved-folder-names',
        'structure/repetitive-naming',
        'structure/excessive-slicing',
        'structure/shared-lib-grouping',
        'structure/import-locality',
        'structure/clean',
      ],
      R2: ['guardrail/place-unknown-file', 'guardrail/unknown-file-imports'],
      R3: ['guardrail/entry-re-export', 'guardrail/export-all'],
      R4: ['structure/cycle', 'structure/cycle-in-routes'],
      R5: ['guardrail/route-re-export', 'guardrail/route-error-boundary'],
    },
  },
  'ADR-0006': {
    scope: {
      paths: ['packages/architecture/**', 'packages/eslint-config/src/index.ts'],
    },
    rules: {
      R1: [
        'guardrail/import-primitive',
        'guardrail/import-component',
        'guardrail/import-entity',
        'guardrail/import-feature',
        'guardrail/import-page',
        'guardrail/import-app',
        'guardrail/import-route',
        'guardrail/import-api',
        'guardrail/import-config',
        'guardrail/import-i18n',
        'guardrail/import-lib',
      ],
      R2: ['guardrail/import-page-internals'],
      R3: [
        'guardrail/module-react-native',
        'guardrail/module-react-native-entry',
        'guardrail/module-react-native-platform',
        'guardrail/module-react-native-namespace',
        'guardrail/module-react-native-gesture-handler',
        'guardrail/module-react-native-reanimated',
        'guardrail/module-react-native-safe-area-context',
        'guardrail/module-react-native-worklets',
        'guardrail/module-react-native-screens',
      ],
      R4: ['guardrail/platform-variant', 'guardrail/platform-variant-primitive'],
    },
  },
  'ADR-0007': {
    scope: {
      paths: [
        'packages/architecture/src/glossary.ts',
        'packages/eslint-config/src/spelling.ts',
        'packages/eslint-config/cspell.json',
      ],
    },
    rules: {
      R1: ['guardrail/spelling-unknown'],
      R2: [
        'guardrail/glossary-term',
        'guardrail/glossary-synonym',
        'lint/glossary-word-inside',
        'lint/glossary-file-name',
      ],
      R3: [
        'guardrail/naming-file',
        'guardrail/naming-folder',
        'guardrail/naming-route-conventions',
        'guardrail/naming-route-file',
        'guardrail/naming-route-folder',
      ],
    },
  },
  'ADR-0008': {
    scope: {
      paths: [
        'tools/git-hooks/**',
        'tools/fixtures/**',
        'tools/governance/src/cli/git-hook.ts',
        'tools/governance/src/cli/hooks-check.ts',
        'tools/governance/src/cli/hooks-install.ts',
      ],
    },
    rules: {
      R1: [
        'git/header',
        'git/header-length',
        'git/type',
        'git/scope',
        'git/scope-before-package',
        'git/body-separator',
        'git/not-canonical',
        'git/generated-fixup',
        'git/generated-message',
        'git/breaking-change-space',
        'git/comment-line',
        'git/control-character',
        'git/valid-message',
      ],
      R2: [
        'git/refs-missing',
        'git/refs-missing-commit-msg',
        'git/refs-format',
        'git/refs-order',
        'git/refs-extra',
        'git/refs-in-prose',
        'git/refs-unrelated-cited',
        'git/refs-scope-required',
        'git/refs-adr-file-required',
        'git/trailer-unknown',
      ],
      R3: [
        'git/hook-missing',
        'git/hook-modified',
        'git/hook-not-executable',
        'git/hook-unexpected',
        'git/hooks-directory-link',
        'git/hooks-path',
        'git/hooks-path-worktree',
        'git/install-refused-hooks-path',
        'git/config-include',
        'git/no-verify-through-shims',
        'git/valid-installation',
        'git/valid-commit-through-shims',
      ],
      R4: [
        'git/verify-failed',
        'git/verify-skipped',
        'git/verify-skipped-index-changed',
        'git/verify-skipped-marker-forged',
        'git/verify-skipped-marker-reused',
        'git/tree-changed',
        'git/index-flagged',
        'git/unstaged',
        'git/unstaged-before-checks',
        'git/untracked',
        'git/unmerged',
        'git/valid-pre-commit',
        'git/valid-staging',
        'git/valid-verified-tree',
      ],
      R5: {
        convention:
          'Le banc de fixtures de tools/fixtures et les tests de couverture et de mutation de chaque liste de preuves prouvent que chaque garde-fou se déclenche exactement sur ses codes.',
      },
      R6: [
        'git/history-bypassed-commit',
        'git/history-replaced-commit',
        'git/patch-refused',
        'git/anchor-not-ancestor',
        'git/anchor-unknown',
        'git/history-shallow',
      ],
    },
  },
  'ADR-0009': {
    scope: {
      paths: ['tools/agents/**'],
    },
    rules: {
      R1: [
        'agent/sudo',
        'agent/sudo-absolute-path',
        'agent/sudo-substituted-name',
        'agent/sudo-wrapped',
        'agent/su-command',
        'agent/chroot',
        'agent/setarch-hides-sudo',
        'agent/systemd-run-root',
      ],
      R2: [
        'agent/no-verify',
        'agent/no-verify-abbreviated',
        'agent/no-verify-ansi-quoted',
        'agent/no-verify-braces',
        'agent/no-verify-find-exec',
        'agent/no-verify-function',
        'agent/no-verify-heredoc-shell',
        'agent/no-verify-ifs',
        'agent/no-verify-split-string',
        'agent/no-verify-unknown-subcommand',
        'agent/no-verify-variable',
        'agent/am-no-verify',
        'agent/cherry-pick-no-verify',
        'agent/merge-no-verify',
        'agent/pull-no-verify',
        'agent/push-no-verify',
        'agent/rebase-no-verify',
        'agent/revert-no-verify',
        'agent/grep-no-verify',
        'agent/hooks-directory',
        'agent/hooks-path-config',
        'agent/hooks-path-option',
        'agent/hooks-path-read',
        'agent/include-path-config',
        'agent/include-path-option',
        'agent/shell-chmod-hook',
      ],
      R3: ['agent/edit-git-config', 'agent/git-dir-variable', 'agent/git-index-variable', 'agent/git-absolute-path'],
      R4: [
        'agent/emulator-compose',
        'agent/emulator-compose-tool',
        'agent/emulator-container-command',
        'agent/emulator-exec',
        'agent/emulator-image',
        'agent/emulator-inspect',
        'agent/emulator-nerdctl',
        'agent/emulator-network',
        'agent/emulator-podman',
        'agent/emulator-remove',
        'agent/emulator-run',
        'agent/emulator-runtime',
        'agent/emulator-script',
        'agent/emulator-volume',
      ],
      R5: ['agent/verify-stamp-forged'],
    },
  },
  'ADR-0010': {
    scope: {
      paths: ['tools/emulator/**'],
    },
    rules: {
      R1: [
        'emulator/image-absent',
        'emulator/image-untagged',
        'emulator/valid-image',
        'emulator/container-other-options',
        'emulator/valid-container',
      ],
      R2: ['emulator/binder-device-mode', 'emulator/binder-unloaded', 'emulator/valid-binder'],
      R3: [
        'emulator/guard-installed-uncommitted',
        'emulator/guard-not-armed',
        'emulator/guard-run-stale',
        'emulator/guard-scripts-changed',
        'emulator/valid-guard',
        'root/run-scripts-changed',
        'root/arm-residue',
      ],
      R4: [
        'emulator/host-drift-session',
        'emulator/host-residue-left',
        'emulator/valid-clean-host',
        'root/run-boot-restored',
        'root/run-boot-keeps-writing',
        'root/run-stop-instance',
        'root/repair-clean-values',
        'root/run-idle-follows',
        'root/run-idle-neighbor',
        'root/run-capture-failed',
        'root/run-docker-unreadable',
        'root/run-empty-values',
        'root/run-filesystem-before-mount-point',
        'root/run-unwritable',
        'root/run-write-failed',
      ],
      R5: [
        'root/plan-any-tracefs-mode',
        'root/plan-appeared-entry',
        'root/plan-idle-android',
        'root/plan-idle-neighbor',
        'root/plan-idle-unvalued-kind',
        'root/plan-instance-running',
        'root/plan-instance-stopped',
        'root/plan-known-attributes',
        'root/plan-known-sysctl',
        'root/plan-multiline',
        'root/plan-other-value',
        'root/plan-unknown-instance',
        'root/plan-unknown-sysctl',
        'root/plan-volatile',
      ],
    },
  },
  'ADR-0011': {
    scope: {
      paths: ['packages/contracts/**'],
    },
    rules: {
      R1: {
        convention:
          'Les types, erreurs et identifiants de données sont définis par des schémas Zod dans packages/contracts, que les autres paquets réemploient.',
      },
      R2: ['deps/dependency-confined'],
      R3: {
        convention:
          'La sortie brandée d’un schéma Zod n’est pas assignable depuis une chaîne : seule l’analyse d’un schéma des contrats produit un identifiant.',
      },
    },
  },
  'ADR-0012': {
    scope: {
      paths: ['packages/design-tokens/**', 'apps/mobile/src/shared/lib/styles/**'],
    },
    rules: {
      R1: {
        convention:
          'Le type Style de apps/mobile/src/shared/lib/styles n’accepte comme valeur dimensionnelle ou colorée qu’un token brandé de @huma/design-tokens, hors de portée d’un nombre ou d’une chaîne bruts.',
      },
      R2: {
        convention:
          'La prop style d’une primitive est typée StyleRef, la marque opaque que seule createStyles produit ; un objet de style quelconque n’y est pas assignable.',
      },
      R3: [
        'guardrail/style-inline',
        'guardrail/style-inline-array',
        'guardrail/style-inline-named',
        'guardrail/style-inline-nested',
      ],
      R4: ['guardrail/style-theme', 'guardrail/style-theme-exempt'],
      R5: ['guardrail/module-expo-system-ui'],
    },
  },
  'ADR-0013': {
    scope: {
      paths: [
        'packages/contracts/src/display-text.ts',
        'apps/mobile/src/shared/i18n/**',
        'apps/mobile/src/shared/lib/display-text/**',
        'apps/mobile/src/shared/lib/format/**',
        'apps/mobile/src/shared/ui/primitives/text/**',
      ],
    },
    rules: {
      R1: ['guardrail/text-mint', 'guardrail/text-mint-reexport'],
      R2: {
        convention:
          'Le texte qu’une primitive de texte reçoit est typé DisplayText, la marque opaque des contrats, qu’il entre par children ou par les fragments d’une phrase ; une chaîne quelconque n’y est pas assignable.',
      },
      R3: ['guardrail/text-jsx'],
    },
  },
  'ADR-0014': {
    scope: {
      paths: ['apps/mobile/src/_app/routes/tabs-layout.tsx'],
    },
    rules: {
      R1: ['guardrail/nav-js-tabs'],
      R2: {
        convention:
          'La barre de navigation par onglets de apps/mobile/src/_app/routes/tabs-layout.tsx est composée avec NativeTabs de expo-router/unstable-native-tabs, le seul composant qui rend des onglets natifs par plateforme.',
      },
    },
  },
  'ADR-0015': {
    scope: {
      paths: ['apps/mobile/src/shared/lib/storage/**', 'apps/mobile/src/_app/model/**'],
    },
    rules: {
      R1: ['guardrail/module-react-native-mmkv'],
      R2: {
        convention:
          'Le buster du cache de PersistQueryClientProvider est CACHE_BUSTER, la constante que pnpm gen calcule en hachant les sources de packages/contracts ; gen:check refuse une valeur périmée, donc un changement des contrats jette le cache persisté.',
      },
    },
  },
  'ADR-0016': {
    scope: {
      paths: [
        'apps/mobile/e2e/**',
        'apps/mobile/jest.config.cjs',
        'apps/mobile/jest.setup.ts',
        'apps/mobile/**/*.test.ts',
        'apps/mobile/**/*.test.tsx',
      ],
    },
    rules: {
      R1: ['guardrail/test-describe-only', 'guardrail/test-it-only', 'guardrail/test-test-only'],
      R4: {
        convention:
          'Les mots que citent les parcours de apps/mobile/e2e sont relus contre le dictionnaire par apps/mobile/src/shared/i18n/flows.test.ts, qui nomme le fichier fautif : une clé renommée sans son parcours échoue à la vérification.',
      },
      R2: {
        convention:
          'Les composants et la logique de apps/mobile sont testés par jest-expo et RNTL, configurés par apps/mobile/jest.config.cjs ; Vitest teste les paquets et les outils, Maestro teste les parcours.',
      },
      R3: {
        convention:
          'Les tests de apps/mobile passent par la commande test:app de pnpm verify, déclarée dans tools/governance/src/commands.ts ; le pre-commit rejoue la vérification, donc chaque commit les passe.',
      },
    },
  },
  'ADR-0017': {
    scope: {
      paths: [
        'apps/mobile/src/_app/model/fonts.ts',
        'apps/mobile/src/_app/routes/startup-gate.tsx',
        'apps/mobile/src/shared/lib/startup/**',
      ],
    },
    rules: {
      R1: ['guardrail/module-expo-font', 'guardrail/module-expo-splash-screen'],
      R2: {
        convention:
          'Une famille de police est un token FontFamily de @huma/design-tokens (FONT_FAMILIES), nommée par jeu de faces et résolue pour un variant par typographyAt, seule porte de la table ; la primitive Text prend un nom de variant, jamais une chaîne, donc aucune police libre n’entre dans le rendu.',
      },
    },
  },
  'ADR-0018': {
    scope: {
      paths: ['apps/mobile/src/shared/ui/primitives/image/**', 'apps/mobile/src/shared/ui/primitives/icon/**'],
    },
    rules: {
      R1: ['guardrail/module-expo-image', 'guardrail/module-expo-symbols'],
      R2: ['guardrail/icon-symbol'],
    },
  },
  'ADR-0021': {
    scope: {
      // A page declares queries as an entity does, so its `api` segment is in scope as well: R2 is about the segment
      // and not about the layer, and a scope that stopped at the entities would leave the one file the rule had to
      // give way for — the newsstand's — changing without ever citing the ADR that governs it.
      paths: [
        'apps/mobile/src/shared/api/**',
        'apps/mobile/src/entities/**',
        'apps/mobile/src/pages/*/api/**',
        'packages/eslint-config/src/query.ts',
      ],
    },
    rules: {
      R1: ['guardrail/module-huma-mock-api', 'guardrail/module-huma-mock-content'],
      R2: ['guardrail/query-options', 'guardrail/query-options-exempt', 'guardrail/query-options-page-exempt'],
    },
  },
  'ADR-0022': {
    scope: {
      paths: ['apps/mobile/src/shared/ui/primitives/list/**', 'apps/mobile/src/shared/ui/primitives/scroll/**'],
    },
    rules: {
      R1: ['guardrail/module-shopify-flash-list'],
      R2: {
        convention:
          'La primitive List rend la seule région défilante verticale de son écran et porte elle-même le fronton qui suit le défilement : elle crée la valeur partagée du décalage, qu’aucune autre place ne peut nommer puisque react-native-reanimated est confinée aux primitives. L’autre région défilante de l’app, la primitive Scroll, exige son axe : aucun appel ne peut prendre l’axe vertical sans l’écrire, et une bande qui défile en travers ne dispute aucun geste à la liste.',
      },
    },
  },
  'ADR-0023': {
    scope: {
      paths: ['apps/mobile/src/shared/lib/routing/**'],
    },
    rules: {
      R1: ['guardrail/module-expo-router'],
      R2: ['guardrail/route-params', 'guardrail/route-params-exempt'],
      R4: ['guardrail/module-expo-linking'],
      R3: {
        convention:
          'Un identifiant du domaine est une chaîne marquée que seul l’analyseur des contrats produit : un écran qui en déclare un ne peut pas l’obtenir d’un paramètre brut, et la marque est inimitable puisque l’assertion de type est interdite partout.',
      },
    },
  },
  'ADR-0025': {
    scope: {
      paths: ['tools/perf/**', 'tools/governance/src/cli/perf-check.ts'],
    },
    rules: {
      R1: [
        'perf/unreadable-startup',
        'perf/unreadable-frames',
        'perf/unreadable-display',
        'perf/unreadable-provenance',
        'perf/no-frames-rendered',
      ],
      R2: ['perf/within-budget', 'perf/cold-start-exceeded', 'perf/scroll-jank-exceeded'],
      R3: ['perf/emulator-refused', 'perf/emulator-refused-qemu'],
      R4: ['perf/debuggable-refused'],
      R5: {
        convention:
          'La table des budgets ne porte que des seuils ; ce qu’une session a relevé vit dans docs/spikes, et la commande perf:check lit une session depuis un dossier plutôt que de l’écrire dans le dépôt.',
      },
    },
  },
  'ADR-0026': {
    scope: {
      paths: [
        'apps/mobile/src/shared/lib/announce/**',
        'apps/mobile/src/shared/ui/primitives/icon/**',
        'apps/mobile/src/shared/ui/primitives/image/**',
        'packages/design-tokens/src/legibility.ts',
        'packages/design-tokens/src/legibility.test.ts',
      ],
    },
    rules: {
      R1: {
        convention:
          'Les props de la primitive d’image et de celle de symbole portent un champ annonces obligatoire, du type Announcement : ou bien une marque DisplayText, ou bien le mot qui dit que la vue est là pour l’œil seul. Rien n’est répandu et le cast est interdit, donc une image ou un symbole monté sans réponse ne compile pas, et le test de chaque primitive relit les deux branches sur la vue rendue.',
      },
      R2: {
        convention:
          'La primitive de texte porte un champ facultatif qui pose le rôle d’en-tête de la plateforme. Aucun outil ne sait ce qu’un titre ouvre — la même variante sert un grand titre et le titre d’une carte dans un fil — donc c’est l’écran qui le déclare ; le test de la primitive tient les deux cas, et les écrans qui en posent un sont relus.',
      },
      R3: ['legibility/paper-in-order', 'legibility/under-bar', 'legibility/ground-unprinted'],
      R4: ['legibility/departure-worse', 'legibility/departure-unprinted'],
      R5: ['legibility/departure-obsolete'],
      R6: ['legibility/shape-under-bar'],
    },
  },
  'ADR-0027': {
    scope: {
      // The wire shapes, the readings that turn the service's markup into text and blocks, the way its pictures are
      // asked for, and the package that asks the service — with the answers all of them are held against. The
      // simulated content is here too, with the section grounds its visuals are drawn in: this ADR supersedes the one
      // that governed them, and a supersession that left them governed by nothing would leave their proofs bound to
      // nothing.
      paths: [
        'packages/contracts/src/intake.ts',
        'packages/contracts/src/intake.test.ts',
        'packages/contracts/src/picture.ts',
        'packages/contracts/src/picture.test.ts',
        'packages/contracts/src/prose.ts',
        'packages/contracts/src/prose.test.ts',
        'packages/contracts/src/remote.ts',
        'packages/design-tokens/src/sections.ts',
        'packages/mock-api/**',
        'packages/mock-content/**',
        'packages/remote-api/**',
        'tools/capture/**',
        'tools/governance/src/cli/capture-read.ts',
        'tools/guardrails/src/proofs/artwork.ts',
        'tools/guardrails/src/proofs/intake.ts',
        'tools/guardrails/src/proofs/picture.ts',
        'tools/guardrails/src/proofs/prose.ts',
      ],
    },
    rules: {
      R1: [
        'intake/reader',
        'intake/unreadable-kept',
        'intake/readable-dropped',
        'intake/loss-unnamed',
        'intake/order-lost',
      ],
      R2: [
        'prose/reader',
        'prose/markup-left',
        'prose/entity-left',
        'prose/aside-kept',
        'prose/donation-kept',
        'prose/break-glued',
        'prose/break-glued-body',
        'prose/edges-loose',
        'prose/speaker-split',
        'prose/figure-lost',
        'prose/nothing-read',
        'prose/nothing-read-plain',
      ],
      R3: [
        'secret/recorded-clean',
        'secret/token',
        'secret/password',
        'secret/address',
        'secret/cookie',
        'secret/cookie-session',
        'secret/key',
        'secret/key-official',
        'secret/key-hash',
      ],
      R4: ['artwork/generator', 'artwork/not-deterministic', 'artwork/key-ignored', 'artwork/section-ignored'],
      R5: ['picture/resizer', 'picture/width-ignored', 'picture/address-changed', 'picture/query-lost'],
    },
  },
  'ADR-0029': {
    scope: {
      // What a build reading the service resolves: the one definition of the variant, the bundler that applies it,
      // the two sources it chooses between, and the check that follows that build's imports.
      paths: [
        'apps/mobile/metro.config.ts',
        'apps/mobile/src/shared/api/source.ts',
        'apps/mobile/src/shared/api/source.service.ts',
        'packages/architecture/src/resolution.ts',
        'tools/structure/src/service-build.ts',
      ],
    },
    rules: {
      R1: ['structure/source-variant', 'structure/service-build-clean'],
      R2: ['structure/service-corpus', 'structure/service-corpus-beside', 'structure/service-build-clean'],
    },
  },
  'ADR-0030': {
    scope: {
      // The one package that asks a value of unknown shape what it is, and the bench that shows every other file
      // refused when it asks by hand. The two policies live in the lint configuration, which older decisions govern.
      paths: ['packages/unknown/**', 'tools/guardrails/src/proofs/unknown.ts'],
    },
    rules: {
      R1: [
        'guardrail/unknown-record',
        'guardrail/unknown-record-reversed',
        'guardrail/unknown-record-switch',
        'guardrail/unknown-record-app',
        'guardrail/unknown-exempt',
      ],
      R2: [
        'guardrail/unknown-list',
        'guardrail/unknown-list-destructured',
        'guardrail/unknown-list-global-this',
        'guardrail/unknown-list-instanceof',
        'guardrail/unknown-list-bundled',
        'guardrail/unknown-list-package-test',
        'guardrail/unknown-exempt',
      ],
    },
  },
  'ADR-0033': {
    scope: {
      // What ADR-0028 governed, unchanged: the client of the service with its judging, the door that hands it the
      // platform's ports and the build's choice of source, the signal that tells the query library the app is back in
      // front, and the bench that bends the client one port at a time — a reader's token now among the ports handed.
      paths: [
        'packages/remote-api/**',
        'apps/mobile/src/_app/model/focus.ts',
        'apps/mobile/src/shared/api/**',
        'apps/mobile/src/shared/config/source.ts',
        'tools/guardrails/src/proofs/transport.ts',
      ],
    },
    rules: {
      R1: ['guardrail/module-huma-remote-api'],
      R2: [
        'transport/client',
        'transport/no-deadline',
        'transport/no-deadline-article',
        'transport/hangs',
        'transport/connection-held',
      ],
      R3: ['transport/cause-misnamed', 'transport/cause-misnamed-article'],
      R4: ['transport/impersonates', 'transport/impersonates-article', 'transport/invents-token'],
      R5: ['transport/address-unknown'],
      R6: {
        convention:
          'La source se nomme dans apps/mobile/src/shared/config/source.ts : sans EXPO_PUBLIC_CONTENT_SOURCE la build lit le mock, un mot que la liste ne tient pas arrête l’app à sa première ligne, et la mise en place des tests nomme le mock quoi que le shell ait exporté. Metro lit la même variable pour résoudre les variantes de service (ADR-0029), et la porte du contenu arrête une build dont le module lié nomme une autre source que la variable.',
      },
      R7: ['transport/reader-unnamed', 'transport/ano-kept'],
      R8: ['transport/expiry-misread'],
      R9: {
        convention:
          'La porte du contenu de l’app oublie le jeton dès qu’une lecture échoue sur la cause « expired », que R8 sépare d’un refus ordinaire : apps/mobile/src/shared/api/reader.ts le tient, apps/mobile/src/shared/api/content.ts l’applique, et les tests de l’app relisent les deux. Aucun banc hors ligne ne peut le juger, le magasin du jeton étant celui de l’app et non du client.',
      },
    },
  },
  'ADR-0034': {
    scope: {
      // Where the token is kept and where the keystore is opened, with the reader that holds it, the registry that
      // names every place the app writes on a phone, the store that takes those places back, the two callers that
      // take a secret one back, and the config that decides whether the phone's own directory travels.
      paths: [
        'apps/mobile/src/shared/lib/storage/keychain.ts',
        'apps/mobile/src/shared/lib/storage/keychain.test.ts',
        'apps/mobile/src/shared/lib/storage/keys.ts',
        'apps/mobile/src/shared/lib/storage/storage.ts',
        'apps/mobile/src/shared/lib/storage/state-storage.ts',
        'apps/mobile/src/shared/api/reader.ts',
        'apps/mobile/src/_app/model/paper.ts',
        'apps/mobile/src/_app/model/persister.ts',
        'apps/mobile/app.config.ts',
      ],
    },
    rules: {
      R1: {
        convention:
          'Le lecteur de l’app est bâti sur le trousseau et sur rien d’autre : apps/mobile/src/shared/api/reader.ts passe keychain à createReader, et apps/mobile/src/shared/lib/storage/keychain.ts est la seule place qui parle à expo-secure-store. Aucune des trois fonctions du port ne lève : le lecteur les appelle à sa première ligne, qui est celle d’un module, et une entrée que la plateforme ne sait plus ouvrir y est lue comme une absence puis vidée. Aucun banc hors ligne ne lit ce qu’un téléphone garde ; les tests de l’app relisent l’aller-retour, la reprise de l’ancien magasin et cette entrée illisible.',
      },
      R2: ['guardrail/module-expo-secure-store'],
      R3: {
        convention:
          'keychain.removeItem écrit une chaîne vide, ce que la plateforme fait de façon synchrone, avant de demander l’effacement, qui ne l’est pas ; une lecture rend l’entrée vide comme une absence. Le test de keychain relit le secret juste après la suppression, sans rien attendre.',
      },
      R4: {
        convention:
          'Le registre des clés sépare les noms secrets des autres (apps/mobile/src/shared/lib/storage/keys.ts, SecretKey et PlainKey), et le magasin donne à chaque famille sa propre porte : storage.remove ne prend qu’une clé simple, storage.forget ne prend qu’une clé secrète et réécrit le fichier. Un retrait de secret ne compile pas. Aucun banc hors ligne ne le mesure : la bibliothèque simulée des tests ne rejoue pas l’écriture en ajout d’un vrai MMKV.',
      },
      R5: {
        convention:
          'apps/mobile/app.config.ts pose android.allowBackup à false, ce que le greffon de configuration d’Expo porte à l’attribut android:allowBackup de l’application principale au prebuild. Le dossier android/ étant régénéré et non suivi, la configuration est la seule place où cela se décide.',
      },
    },
  },
  'ADR-0036': {
    scope: {
      // The two layers a store may be declared in, and the facade every store writes through. The features and the
      // facade were ADR-0024's: this ADR supersedes it, and a supersession that left them governed by nothing would
      // leave their proof bound to nothing.
      paths: ['apps/mobile/src/features/**', 'apps/mobile/src/pages/**', 'apps/mobile/src/shared/lib/storage/**'],
    },
    rules: {
      R1: ['guardrail/module-zustand', 'guardrail/module-zustand-page-exempt'],
      R2: {
        convention:
          'La façade du stockage n’accepte qu’une clé du registre : son paramètre est typé sur les valeurs de la table, si bien qu’une clé écrite à la main ne compile pas, et le registre reste le seul endroit où lire ce que l’app pose sur le disque.',
      },
      R3: {
        convention:
          'Chaque magasin nomme la version du format qu’il écrit et le middleware de persistance l’inscrit dans l’enveloppe posée sur le disque ; elle est relue à la restauration, et un format d’une autre version passe par la migration ou est écarté. Un test par magasin relit l’enveloppe écrite et y vérifie la version, le middleware laissant par défaut une version nulle à qui ne la nomme pas.',
      },
      R4: {
        convention:
          'Ce qui revient du disque est une chaîne quelconque, qu’un fichier modifié à la main peut avoir remplacée : chaque magasin la relit valeur par valeur avant de rien servir — par l’analyseur marqué des contrats quand la valeur est un identifiant, contre la liste close des valeurs admises quand c’est un réglage — et ce qui n’en ressort pas est laissé pour la valeur du journal, si bien qu’un disque modifié ne peut pas placer dans un magasin une valeur que le reste de l’app croirait validée.',
      },
      // By elimination: R1 leaves a store a feature or a page, a feature that one slice alone references is refused, a
      // page may declare one, and a page imports no other page — so the one screen that reads a store is the one whose
      // page holds it.
      R5: ['structure/insignificant-slice', 'guardrail/module-zustand-page-exempt'],
    },
  },
  'ADR-0037': {
    scope: {
      // What ADR-0035 governed, which this ADR supersedes, less the local answer to a question that it retires: the
      // queries and the head-first page of an article, the lists that ask when a finger lands, the press that reports
      // the landing, and the app's own opening. And what a search now waits with: the stand-in of a feed, the field
      // whose rule says the journal is looking, and the rule itself.
      paths: [
        'apps/mobile/src/entities/article/api/queries.ts',
        'apps/mobile/src/entities/article/model/known.ts',
        'apps/mobile/src/entities/article/model/paged-feed.ts',
        'apps/mobile/src/entities/article/ui/article-reader.tsx',
        'apps/mobile/src/entities/article/ui/prose-stand-in.tsx',
        'apps/mobile/src/entities/article/ui/article-feed.tsx',
        'apps/mobile/src/entities/article/ui/article-wire.tsx',
        'apps/mobile/src/entities/article/ui/feed-stand-in.tsx',
        'apps/mobile/src/pages/article/ui/article-page.tsx',
        'apps/mobile/src/pages/search/ui/search-page.tsx',
        'apps/mobile/src/pages/search/ui/search-field.tsx',
        'apps/mobile/src/shared/ui/primitives/progress/progress.tsx',
        'apps/mobile/src/shared/ui/primitives/pressable/pressable.tsx',
        'apps/mobile/src/shared/ui/primitives/curtain/curtain.tsx',
        'apps/mobile/src/shared/ui/primitives/breathing/breathing.tsx',
        'apps/mobile/src/_app/routes/opening.tsx',
        'apps/mobile/src/_app/routes/startup-gate.tsx',
      ],
    },
    rules: {
      R1: {
        convention:
          'L’écran d’un article montre ce que l’app en sait avant que le journal ne réponde : le résumé lu dans une liste du cache, que rend useReadSummary (apps/mobile/src/entities/article/model/known.ts) par summaryAmongRead, ou l’article gardé dans les Lectures, passés au lecteur comme sa tête. Un test d’article-page.test.tsx tient la réponse du journal en suspens et trouve déjà le titre de l’article gardé.',
      },
      R2: {
        convention:
          'La page de recherche lit une seule requête, searchQuery, et ne tend à sa liste que ce qu’elle rend (apps/mobile/src/pages/search/ui/search-page.tsx) : rien d’autre ne tient lieu de réponse. search-page.test.tsx garnit le cache d’articles qui portent la question et vérifie qu’aucun ne s’affiche tant que le journal cherche, quand il ne trouve rien, ni quand il ne répond pas, et qu’une réponse revenue en retard ne s’affiche pas sous la question suivante.',
      },
      R3: {
        convention:
          'Tant que le journal n’a pas répondu, FeedStandIn dresse les silhouettes que la liste lui donne, et le trait sous le champ fait courir son segment et se dit « Le journal cherche … » à VoiceOver (clé search.asking d’apps/mobile/src/shared/i18n/fr.ts) ; un échec se dit par sa cause, une réponse vide par la question posée. search-page.test.tsx écoute l’annonce et compte les silhouettes.',
      },
      R4: {
        convention:
          'Une relecture garde les pages lues : TanStack Query ne rend le statut pending qu’à une lecture sans aucune donnée, et stateOf (apps/mobile/src/entities/article/model/paged-feed.ts) n’en tire l’attente que dans ce cas ; l’indicateur de la plateforme tourne pendant la relecture demandée, la liste restant dessous. Une question nouvelle est une autre lecture, que des silhouettes attendent.',
      },
      R5: ['guardrail/reading-press', 'guardrail/reading-press-exempt'],
      R6: {
        convention:
          'L’ouverture ne compte son plancher qu’une fois le téléphone dessaisi : le portail attend la réponse de hideAsync avant de dire shown, et apps/mobile/src/_app/routes/opening.tsx part de là pour ses 650 ms — un quart de seconde dû au lecteur, plus les 350 ms au pire que le téléphone met à retirer son champ après avoir répondu. Deux tests de startup-gate.test.tsx tiennent les deux bouts : un téléphone qui ne répond jamais garde l’ouverture, un téléphone qui répond la voit partir.',
      },
    },
  },
  'ADR-0038': {
    scope: {
      // The two workflows the server runs, the configuration of the scan one of them runs, and the reading that holds
      // both to the rules. The rules GitHub holds on its side — branches, tags, environments — live outside the tree.
      paths: ['.github/workflows/**', '.gitleaks.toml', 'tools/git-hooks/src/workflow.ts'],
    },
    rules: {
      R1: [
        'git/valid-workflows',
        'git/valid-workflow-plans',
        'git/ci-missing',
        'git/ci-unreadable',
        'git/ci-trigger',
        'git/ci-verify',
        'git/ci-shallow',
        'git/ci-merge-ref',
      ],
      R2: ['git/ci-secrets'],
      R3: ['git/ci-unpinned'],
      R4: ['git/ci-permissions'],
      R5: ['git/ci-identity', 'git/ci-foreign-secret', 'git/ci-variant'],
      R6: ['git/ci-release-trigger'],
      R7: {
        convention:
          'Le job android de .github/workflows/release.yml signe l’APK par apksigner avec la clé des secrets ANDROID_RELEASE_KEYSTORE et ANDROID_RELEASE_KEYSTORE_PASSWORD, que seul l’environnement release expose, à un tag v* seulement, puis refuse l’APK dont le certificat n’a pas l’empreinte RELEASE_CERT_SHA256 épinglée dans le même fichier.',
      },
      R8: {
        convention:
          'La règle « main : historique intouchable » du dépôt sur GitHub interdit la suppression, le force-push et un historique non linéaire sur la branche par défaut, sans personne pour la contourner (gh api repos/alexandre-vl/humanite-app/rulesets).',
      },
      R9: {
        convention:
          'La règle « main : contributions vérifiées » exige une pull request, fusionnée par rebase seulement, et les contrôles pnpm verify, secrets (gitleaks), build Android et build iOS verts ; le dépôt n’autorise ni fusion par commit de fusion ni par écrasement (gh api repos/alexandre-vl/humanite-app).',
      },
      R10: {
        convention:
          'Le rôle d’administrateur du dépôt contourne « main : contributions vérifiées », et lui seul : un push direct du mainteneur passe sous ses hooks locaux, puis la CI le rejoue.',
      },
      R11: {
        convention:
          'La règle « main : contributions vérifiées » exige aussi les résultats de CodeQL, réglé par défaut sur le dépôt, et refuse une pull request qui ouvre une alerte de sécurité moyenne ou plus, ou une erreur (gh api repos/alexandre-vl/humanite-app/rulesets/24038072).',
      },
    },
  },
  'ADR-0039': {
    scope: {
      // Where a build's identity is chosen, and the workflows that ask for one: the CI never does, the release always.
      paths: ['apps/mobile/app.config.ts', '.github/workflows/**'],
    },
    rules: {
      R1: {
        convention:
          'apps/mobile/app.config.ts lit APP_VARIANT : rien ou development donne alexandrevl.humanite.app.dev, « L’Humanité dev » et le schéma humanite-dev ; release donne alexandrevl.humanite.app, « L’Humanité » et humanite ; toute autre valeur arrête la configuration (APP_VARIANT=x pnpm exec expo config).',
      },
      R2: ['git/ci-release-identity'],
      R3: ['git/release-identity'],
      R4: {
        convention:
          'alexandrevl.humanite.app est l’identifiant des releases depuis v0.1.1 ; le gate de .github/workflows/release.yml le compare, écrit en toutes lettres, à celui que la release construit.',
      },
    },
  },
  'ADR-0040': {
    scope: {
      // The reading that honours the right, and the bench where the delivered read client is judged, as under 0032;
      // and the connection this ADR reshapes — the client credential written in the open, the device the app mints
      // for itself, and the reader that carries a subscriber's token no further than the keystore.
      paths: [
        'packages/contracts/src/intake.ts',
        'packages/contracts/src/session.ts',
        'packages/remote-api/src/session.ts',
        'packages/remote-api/src/routes.ts',
        'packages/remote-api/src/device.ts',
        'packages/remote-api/src/aes.ts',
        'apps/mobile/src/shared/api/reader.ts',
        'tools/guardrails/src/proofs/right.ts',
        'tools/guardrails/src/proofs/transport.ts',
      ],
    },
    rules: {
      R1: ['right/reader', 'right/withheld-opened', 'right/granted-withheld'],
      R2: ['transport/borrows-key'],
      R3: {
        convention:
          'L’app PEUT demander à l’abonné les identifiants de son abonnement et les porter à POST /user/login pour obtenir un jeton d’usager ; le client de lecture livré (packages/remote-api/src/api.ts) ne porte aucun secret, que la fixture transport/borrows-key tient.',
      },
      R4: {
        convention:
          'packages/remote-api/src/routes.ts porte CLIENT_SECRET, la clé publique du client, et device.ts frappe l’attestation jdly d’un UUID (AES-128-CBC, aes.ts) ; apps/mobile/src/shared/api/reader.ts garde cet UUID et n’offre la connexion qu’aux builds du service. device.test.ts, aes.test.ts et reader.test.ts les tiennent.',
      },
      R5: {
        convention:
          'Aucun fichier suivi ne porte l’identifiant, le mot de passe ou le jeton d’usager d’un abonné : reader.ts ne confie le jeton qu’au trousseau (ADR-0034), une lecture de tools/capture/src/secrets.ts arrête toute capture qui en écrirait un, et le client de lecture n’en porte aucun.',
      },
    },
  },
  'ADR-0041': {
    scope: {
      // Where a reply's headers are read and the successor token passed on — the transport, its bench and its judging
      // — and where the app decides whether that successor replaces the one it holds: the reader, the door that hands
      // it the platform's network, and the cache that follows a change of reader but not a renewal.
      paths: [
        'packages/remote-api/src/transport.ts',
        'packages/remote-api/src/judge.ts',
        'packages/remote-api/src/bench.ts',
        'apps/mobile/src/shared/api/reader.ts',
        'apps/mobile/src/shared/api/source.service.ts',
        'apps/mobile/src/_app/model/paper.ts',
        'tools/guardrails/src/proofs/transport.ts',
      ],
    },
    rules: {
      R1: ['transport/renewal-dropped'],
      R2: ['transport/renewal-unearned'],
      R3: {
        convention:
          'Reader.renew écrit le jeton sans appeler aucun observateur, là où signIn et signOut passent par hold qui les appelle : apps/mobile/src/shared/api/reader.ts tient les deux chemins, et les tests de l’app relisent qu’un renouvellement laisse en place le cache et le disque que forgetThePaperWhenTheReaderChanges vide à un changement de lecteur (reader.test.ts, paper.test.ts). Aucun banc hors ligne ne le juge, le magasin du jeton étant celui de l’app et non du client.',
      },
      R4: {
        convention:
          'Reader.renew écrit au trousseau par la même fonction que hold (KEYCHAIN_KEYS.readerToken, ADR-0034), si bien qu’un téléphone redémarre sur le dernier jeton reçu et non sur celui du login. reader.test.ts relit l’aller-retour par le disque, source.service.test.ts celui depuis l’en-tête du service.',
      },
      R5: {
        convention:
          'Reader.renew n’écrit que si le jeton tenu est encore celui que la requête a porté, ce que le transport lui passe avec le jeton neuf : un jeton arrivé après une déconnexion ne reconnecte personne, et une réponse lente ne remet pas ce qu’une plus rapide a remplacé. reader.test.ts relit les deux cas.',
      },
    },
  },
  'ADR-0042': {
    scope: {
      // Where the credentials are kept and read back — the keychain and its keys registry, and the reader that stores
      // them at sign-in, reopens from them on a dead token, and erases them on sign-out — and the cache that a reopen,
      // being the same subscriber, must not drop.
      paths: [
        'apps/mobile/src/shared/lib/storage/keychain.ts',
        'apps/mobile/src/shared/lib/storage/keychain.test.ts',
        'apps/mobile/src/shared/lib/storage/keys.ts',
        'apps/mobile/src/shared/api/reader.ts',
        'apps/mobile/src/_app/model/paper.ts',
      ],
    },
    rules: {
      R1: ['guardrail/module-expo-secure-store'],
      R2: {
        convention:
          'createReader n’écrit les identifiants qu’après le jeton rendu par createSession(...).open, donc après un 200 du service : un login refusé lève avant l’écriture. reader.test.ts relit qu’un mot de passe refusé ne laisse rien au disque des identifiants.',
      },
      R3: {
        convention:
          'forgettingDeadTokens, sur la cause « expired » (ADR-0033 R8), appelle reader.reopen puis redemande une fois avant de signOut : reader.reopen rouvre depuis les identifiants gardés, une seule fois pour des lectures qui échouent ensemble. apps/mobile/src/shared/api/reader.ts le tient, reader.test.ts relit la reconnexion, son unicité, et l’oubli quand elle échoue.',
      },
      R4: {
        convention:
          'Reader.reopen écrit le jeton par write et non hold, donc sans appeler d’observateur, si bien que forgetThePaperWhenTheReaderChanges ne vide pas le cache d’un abonné rouvert. reader.test.ts relit qu’aucun observateur n’est prévenu, paper.test.ts que le journal survit à une reconnexion et qu’un jeton irrécupérable le vide.',
      },
      R5: {
        convention:
          'signOut efface les identifiants (credentialsDisk.removeItem) avant d’oublier le jeton, et reopen rend false sans rien garder quand le service refuse les identifiants, ce qui mène la porte à signOut. reader.test.ts relit l’effacement à la déconnexion et le refus à la reconnexion.',
      },
    },
  },
} as const satisfies Bindings<ProofId>;
