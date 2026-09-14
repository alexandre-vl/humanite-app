import { fixtureFactory } from '@huma/fixtures';
import type { AgentPolicy } from '../policy.ts';
import { agentPolicy } from '../policy.ts';
import { judgeToolCall } from '../guard.ts';

export const AGENT_CODES = ['agent/denied'] as const;

export type AgentCode = (typeof AGENT_CODES)[number];

const define = fixtureFactory<AgentCode>();

const ROOT = '/depot';

const ADR = `${ROOT}/docs/adr/0000-validation-des-donnees-par-zod.md`;

const PROPOSED_HEADER =
  '---\nformat: 1\nstatus: proposed\nsignificance: [dependency]\n---\n\n# Validation des données par Zod\n';

const ACCEPTED_HEADER = PROPOSED_HEADER.replace('status: proposed', 'status: accepted');

/** The policy of a workspace whose human-only command is `adr:decide`, run by its entry file. */
export const FIXTURE_POLICY: AgentPolicy = agentPolicy([
  { script: 'adr:decide', entry: 'tools/governance/src/cli/adr-decide.ts' },
]);

type Call = Readonly<{ tool: string; input: Readonly<Record<string, unknown>> }>;

const judgedPayload =
  (payload: unknown, files: Readonly<Record<string, string>> = {}) =>
  async (): Promise<readonly AgentCode[]> => {
    const verdict = await judgeToolCall(payload, {
      policy: FIXTURE_POLICY,
      findRoot: async (path) => Promise.resolve(path.startsWith(`${ROOT}/`) ? ROOT : null),
      readFile: async (path) => Promise.resolve(files[path] ?? null),
    });
    return verdict.kind === 'deny' ? ['agent/denied'] : [];
  };

const judged = (call: Call, files: Readonly<Record<string, string>> = {}): (() => Promise<readonly AgentCode[]>) =>
  judgedPayload({ tool_name: call.tool, tool_input: call.input, cwd: ROOT }, files);

const bash = (command: string): Call => ({ tool: 'Bash', input: { command } });

export const AGENT_FIXTURES = [
  define(
    'agent/decide-script',
    'un agent lance pnpm adr:decide',
    ['agent/denied'],
    judged(bash('pnpm adr:decide ADR-0000 accepted')),
  ),
  define(
    'agent/decide-run-script',
    'un agent lance pnpm run adr:decide',
    ['agent/denied'],
    judged(bash('pnpm run adr:decide ADR-0000 accepted')),
  ),
  define(
    'agent/decide-entry',
    'un agent lance le fichier de la décision avec node',
    ['agent/denied'],
    judged(bash('node_modules/.bin/node tools/governance/src/cli/adr-decide.ts ADR-0000 accepted')),
  ),
  define(
    'agent/decide-masked-session',
    'un agent masque sa session avant la décision',
    ['agent/denied'],
    judged(bash('env -u CLAUDECODE pnpm adr:decide ADR-0000 accepted')),
  ),
  define(
    'agent/decide-in-subshell',
    'un agent lance la décision dans bash -c',
    ['agent/denied'],
    judged(bash("cd /depot && bash -c 'pnpm adr:decide ADR-0000 accepted'")),
  ),
  define(
    'agent/decide-in-substitution',
    'un agent lance la décision dans une substitution',
    ['agent/denied'],
    judged(bash('echo $(pnpm adr:decide ADR-0000 rejected)')),
  ),
  define(
    'agent/decide-monitor',
    'un agent lance la décision par l’outil Monitor',
    ['agent/denied'],
    judged({ tool: 'Monitor', input: { command: 'pnpm adr:decide ADR-0000 accepted' } }),
  ),
  define(
    'agent/decide-mentioned',
    'un agent cherche le nom de la commande',
    [],
    judged(bash('grep -rn "adr:decide" docs/')),
  ),
  define(
    'agent/unset-session',
    'un agent retire CLAUDECODE de son environnement',
    ['agent/denied'],
    judged(bash('unset CLAUDECODE; pnpm adr:check')),
  ),
  define('agent/adr-check', 'un agent vérifie les ADR', [], judged(bash('pnpm adr:check'))),

  define(
    'agent/no-verify',
    'un agent commite avec --no-verify',
    ['agent/denied'],
    judged(bash('git commit --no-verify -m "fix: x"')),
  ),
  define(
    'agent/no-verify-abbreviated',
    'un agent commite avec --no-veri',
    ['agent/denied'],
    judged(bash('git commit --no-veri -m "fix: x"')),
  ),
  define(
    'agent/short-n-cluster',
    'un agent commite avec -nm',
    ['agent/denied'],
    judged(bash('git commit -nm "fix: x"')),
  ),
  define(
    'agent/message-with-n',
    'un agent commite un message qui contient -n',
    [],
    judged(bash('git commit -m "-n dans le message"')),
  ),
  define('agent/log-n', 'un agent lit l’historique avec -n', [], judged(bash('git log -n 5 --oneline'))),
  define(
    'agent/hooks-path-option',
    'un agent désactive les hooks par -c core.hooksPath',
    ['agent/denied'],
    judged(bash('git -c core.hooksPath=/dev/null commit -m "fix: x"')),
  ),
  define(
    'agent/hooks-path-config',
    'un agent change core.hooksPath',
    ['agent/denied'],
    judged(bash('git config core.hooksPath /tmp/vide')),
  ),
  define(
    'agent/config-environment',
    'un agent passe la configuration git par l’environnement',
    ['agent/denied'],
    judged(bash('GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git commit -m x')),
  ),
  define(
    'agent/commit-tree',
    'un agent écrit un commit par la plomberie',
    ['agent/denied'],
    judged(bash('git commit-tree HEAD^{tree} -m x')),
  ),
  define(
    'agent/hooks-directory',
    'un agent vide un hook',
    ['agent/denied'],
    judged(bash('printf "" > .git/hooks/pre-commit')),
  ),
  define(
    'agent/push-no-verify',
    'un agent pousse avec --no-verify',
    ['agent/denied'],
    judged(bash('git push --no-verify origin main')),
  ),
  define(
    'agent/plain-commit',
    'un agent commite normalement',
    [],
    judged(bash('git add -A && git commit -m "feat: x"')),
  ),

  define('agent/sudo', 'un agent lance sudo', ['agent/denied'], judged(bash('sudo systemctl restart docker'))),
  define(
    'agent/sudo-wrapped',
    'un agent lance sudo derrière env',
    ['agent/denied'],
    judged(bash('env LANG=C sudo ls /root')),
  ),

  define(
    'agent/edit-git-config',
    'un agent édite .git/config',
    ['agent/denied'],
    judged({ tool: 'Edit', input: { file_path: `${ROOT}/.git/config`, old_string: 'a', new_string: 'b' } }),
  ),
  define(
    'agent/write-settings',
    'un agent réécrit les réglages Claude Code',
    ['agent/denied'],
    judged({ tool: 'Write', input: { file_path: `${ROOT}/.claude/settings.json`, content: '{}' } }),
  ),
  define(
    'agent/write-local-settings',
    'un agent crée des réglages locaux',
    ['agent/denied'],
    judged({
      tool: 'Write',
      input: { file_path: `${ROOT}/.claude/settings.local.json`, content: '{"disableAllHooks":true}' },
    }),
  ),
  define(
    'agent/write-source',
    'un agent écrit un fichier source',
    [],
    judged({ tool: 'Write', input: { file_path: `${ROOT}/tools/a.ts`, content: 'export {};' } }),
  ),
  define(
    'agent/write-outside',
    'un agent écrit hors du dépôt',
    [],
    judged({ tool: 'Write', input: { file_path: '/tmp/note.md', content: 'status: accepted' } }),
  ),

  define(
    'agent/status-edit',
    'un agent passe un ADR à accepted',
    ['agent/denied'],
    judged(
      { tool: 'Edit', input: { file_path: ADR, old_string: 'status: proposed', new_string: 'status: accepted' } },
      { [ADR]: PROPOSED_HEADER },
    ),
  ),
  define(
    'agent/decided-edit',
    'un agent modifie un ADR accepté',
    ['agent/denied'],
    judged(
      { tool: 'Edit', input: { file_path: ADR, old_string: 'Zod', new_string: 'Valibot' } },
      { [ADR]: ACCEPTED_HEADER },
    ),
  ),
  define(
    'agent/decided-multi-edit',
    'un agent modifie un ADR accepté par MultiEdit',
    ['agent/denied'],
    judged(
      { tool: 'MultiEdit', input: { file_path: ADR, edits: [{ old_string: 'Zod', new_string: 'Joi' }] } },
      { [ADR]: ACCEPTED_HEADER },
    ),
  ),
  define(
    'agent/proposed-edit',
    'un agent modifie un ADR proposé',
    [],
    judged(
      { tool: 'Edit', input: { file_path: ADR, old_string: 'Zod', new_string: 'Valibot' } },
      { [ADR]: PROPOSED_HEADER },
    ),
  ),
  define(
    'agent/relative-status-write',
    'un agent écrit un statut décidé par un chemin relatif',
    ['agent/denied'],
    judged({
      tool: 'Write',
      input: { file_path: 'docs/adr/0000-validation-des-donnees-par-zod.md', content: ACCEPTED_HEADER },
    }),
  ),

  define(
    'agent/unreadable-input',
    'une entrée de hook qui n’est pas un objet',
    ['agent/denied'],
    judgedPayload('texte'),
  ),
  define('agent/other-tool', 'un outil de lecture', [], judged({ tool: 'Read', input: { file_path: ADR } })),
] as const;

export type AgentProofId = (typeof AGENT_FIXTURES)[number]['id'];
