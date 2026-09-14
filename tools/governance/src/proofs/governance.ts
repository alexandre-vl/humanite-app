import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDEX_FILE } from '@huma/adr/layout';
import { PROPOSED, ZERO } from '@huma/adr/proof-documents';
import { renderClaudeSettings } from '@huma/agents/settings';
import type { FileTree } from '@huma/fixtures';
import { createRepository, fixtureFactory } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import { arrayField, isJsonObject, objectField, parseJson, stringField } from '@huma/kit/json';
import { runText } from '@huma/kit/process';
import { ADR_INDEX_ARTIFACT, checkArtifacts } from '../artifacts.ts';
import type { GovernanceCode } from '../checks.ts';
import { guardFailureOutput } from '../hooks/fallback.ts';
import { HOOK_COMMANDS, POLICY } from '../policy.ts';

export const HOOK_CODES = ['hook/denied', 'hook/blocked'] as const;

export type GovernanceProofCode = GovernanceCode | (typeof HOOK_CODES)[number];

const define = fixtureFactory<GovernanceProofCode>();

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Codes of the index check on a repository holding a valid ADR and the files `files` derives from the right index. */
async function indexCheck(files: (index: string) => FileTree): Promise<readonly GovernanceProofCode[]> {
  await using directory = await temporaryDirectory('governance-gen');
  const reference = join(directory.path, 'reference');
  await createRepository(reference, { commits: [{ files: { [ZERO]: PROPOSED } }] });
  const expected = await ADR_INDEX_ARTIFACT.render(reference);
  const checked = join(directory.path, 'checked');
  await createRepository(checked, { commits: [{ files: { [ZERO]: PROPOSED, ...files(expected) } }] });
  return (await checkArtifacts(checked, [ADR_INDEX_ARTIFACT])).map((item) => item.code);
}

type HookEvent = 'PreToolUse' | 'Stop';

/** The command line the rendered settings give to the first hook of `event`. */
function settingsCommand(event: HookEvent): string {
  const settings = parseJson(renderClaudeSettings(POLICY, HOOK_COMMANDS));
  const entries = isJsonObject(settings) ? arrayField(objectField(settings, 'hooks') ?? {}, event) : null;
  const [entry] = entries ?? [];
  const [hook] = isJsonObject(entry) ? (arrayField(entry, 'hooks') ?? []) : [];
  const command = isJsonObject(hook) ? stringField(hook, 'command') : null;
  if (command === null) {
    throw new Error(`Commande ${event} absente des réglages rendus`);
  }
  return command;
}

/** Runs the exact command of the rendered settings for `event` on `input`, as Claude Code does; codes from its answer. */
async function hookCommand(
  event: HookEvent,
  input: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
): Promise<readonly GovernanceProofCode[]> {
  const output = await runText('sh', ['-c', settingsCommand(event)], {
    cwd: REPOSITORY_ROOT,
    env: { ...process.env, CLAUDE_PROJECT_DIR: REPOSITORY_ROOT.replace(/\/$/u, '') },
    input: JSON.stringify({ hook_event_name: event, cwd: REPOSITORY_ROOT, ...input }),
    signal,
  });
  if (output.trim() === '') {
    return [];
  }
  const answer = parseJson(output);
  const specific = isJsonObject(answer) ? objectField(answer, 'hookSpecificOutput') : null;
  if (specific !== null && stringField(specific, 'permissionDecision') === 'deny') {
    return ['hook/denied'];
  }
  if (isJsonObject(answer) && stringField(answer, 'decision') === 'block') {
    return ['hook/blocked'];
  }
  throw new Error(`Réponse inattendue du hook : ${output}`);
}

const toolCall = async (command: string, signal: AbortSignal): Promise<readonly GovernanceProofCode[]> =>
  hookCommand('PreToolUse', { tool_name: 'Bash', tool_input: { command } }, signal);

export const GOVERNANCE_FIXTURES = [
  define('gen/in-step', 'un index des ADR régénéré à l’identique', [], async () =>
    indexCheck((index) => ({ [INDEX_FILE]: index })),
  ),
  define('gen/stale-index', 'un index des ADR périmé', ['gen/stale'], async () =>
    indexCheck(() => ({ [INDEX_FILE]: '# Index périmé\n' })),
  ),
  define('gen/missing-index', 'un index des ADR absent', ['gen/missing'], async () => indexCheck(() => ({}))),
  define(
    'hook/settings-command-denies',
    'la commande du hook des réglages refuse adr:decide',
    ['hook/denied'],
    async ({ signal }) => toolCall('pnpm adr:decide ADR-0000 accepted', signal),
  ),
  define(
    'hook/settings-command-allows',
    'la commande du hook des réglages laisse passer adr:check',
    [],
    async ({ signal }) => toolCall('pnpm adr:check', signal),
  ),
  define(
    'hook/failure-denies-sensitive',
    'une garde en échec refuse ce qui touche une zone protégée',
    ['hook/denied'],
    async () =>
      Promise.resolve(
        guardFailureOutput('{"tool_input":{"command":"pnpm adr:decide ADR-0000 accepted"}}', new Error('panne')) === ''
          ? []
          : ['hook/denied'],
      ),
  ),
  define('hook/failure-allows-innocuous', 'une garde en échec laisse passer une lecture ordinaire', [], async () =>
    Promise.resolve(
      guardFailureOutput('{"tool_input":{"command":"ls tools"}}', new Error('panne')) === '' ? [] : ['hook/denied'],
    ),
  ),
  define(
    'hook/stop-unverifiable-blocks',
    'un hook Stop qui ne peut pas lancer les contrôles garde l’agent au travail',
    ['hook/blocked'],
    async ({ signal }) => hookCommand('Stop', { cwd: '/nonexistent/huma-workspace', stop_hook_active: false }, signal),
  ),
  define(
    'hook/stop-unverifiable-once',
    'le même échec ne bloque pas un second arrêt, pour éviter une boucle',
    [],
    async ({ signal }) => hookCommand('Stop', { cwd: '/nonexistent/huma-workspace', stop_hook_active: true }, signal),
  ),
] as const;

export type GovernanceProofId = (typeof GOVERNANCE_FIXTURES)[number]['id'];
