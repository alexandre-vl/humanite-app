import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FileTree, Fixture } from '@huma/fixtures';
import { createTemporaryDirectory, writeTree } from '@huma/fixtures';
import { createAdr, nextNumber } from '../creation.ts';
import { decide } from '../decision.ts';
import type { Bindings } from '../model.ts';
import { adrNumber, repoPath } from '../model.ts';
import type { DecidedStatus } from '../spec.ts';
import { adrDocument, pathFor, replaceOnce } from './documents.ts';
import type { FixtureRepository } from './repository.ts';
import { FAKE_PROOFS, gitIn, materialize } from './repository.ts';

export type LifecycleCode =
  'guard/denied' | 'decide/refused' | 'decide/decided' | 'new/duplicate-number' | 'hook/not-wired';

type LifecycleFixture<Id extends string, Expected extends readonly LifecycleCode[]> = Fixture<Id, LifecycleCode> &
  Readonly<{ expected: Expected }>;

const define = <const Id extends string, const Expected extends readonly LifecycleCode[]>(
  id: Id,
  description: string,
  expected: Expected,
  run: () => Promise<readonly LifecycleCode[]>,
): LifecycleFixture<Id, Expected> => ({ id, description, expected, run });

const GUARD_SCRIPT = fileURLToPath(new URL('../cli/agent-guard.ts', import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const ZERO = pathFor(adrNumber(0));
const proposed = adrDocument();
const accepted = adrDocument({ status: 'accepted' });

async function runGuard(stdin: string): Promise<string> {
  const child = spawn('node', [GUARD_SCRIPT], { stdio: ['pipe', 'pipe', 'inherit'] });
  const chunks: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
  const exit = new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  child.stdin.end(stdin);
  const code = await exit;
  if (code !== 0) {
    throw new Error(`agent-guard s’est terminé avec le code ${String(code)}`);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const isFields = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Codes observed when the real hook script judges a tool call inside a throwaway repository. */
async function guardCall(
  tree: FileTree,
  toolName: 'Write' | 'Edit' | 'Bash',
  toolInput: (root: string) => Readonly<Record<string, unknown>>,
): Promise<readonly LifecycleCode[]> {
  await using directory = await createTemporaryDirectory('adr-guard');
  await writeTree(directory.path, { 'pnpm-workspace.yaml': 'packages: []\n', ...tree });
  const output = await runGuard(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: toolName,
      tool_input: toolInput(directory.path),
      cwd: directory.path,
    }),
  );
  if (output.trim() === '') {
    return [];
  }
  const answer: unknown = JSON.parse(output);
  const specific = isFields(answer) ? answer['hookSpecificOutput'] : undefined;
  if (isFields(specific) && specific['permissionDecision'] === 'deny') {
    return ['guard/denied'];
  }
  throw new Error(`Réponse inattendue du hook : ${output}`);
}

const passingBindings: Bindings = { 'ADR-0000': { scope: ['docs/adr/**'], rules: { R1: [FAKE_PROOFS.passing] } } };

async function decision(
  repository: FixtureRepository,
  status: DecidedStatus,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<readonly LifecycleCode[]> {
  await using directory = await createTemporaryDirectory('adr-decide');
  await materialize(directory.path, repository);
  const outcome = await decide({
    root: directory.path,
    number: adrNumber(0),
    status,
    bindings: {
      bindings: repository.bindings ?? {},
      path: repoPath('tools/adr/src/bindings.ts'),
      text: null,
      knownProofs: new Set(Object.values(FAKE_PROOFS)),
    },
    runProof: async (proof) => {
      await Promise.resolve();
      return proof === FAKE_PROOFS.passing;
    },
    environment,
  });
  if (outcome.kind === 'refused') {
    return ['decide/refused'];
  }
  if (outcome.diagnostics.length > 0) {
    throw new Error(
      `Décision écrite mais adr:check échoue ensuite : ${outcome.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return ['decide/decided'];
}

async function parallelNumbers(): Promise<readonly LifecycleCode[]> {
  await using directory = await createTemporaryDirectory('adr-new');
  const main = join(directory.path, 'main');
  const other = join(directory.path, 'other');
  await materialize(main, { commits: [{ [ZERO]: proposed }] });
  await gitIn(main, ['worktree', 'add', '--quiet', '-b', 'other', other]);
  const [first, second] = await Promise.all([
    createAdr(main, 'Premier sujet en parallèle', ['dependency']),
    createAdr(other, 'Second sujet en parallèle', ['dependency']),
  ]);
  return first.number === second.number ? ['new/duplicate-number'] : [];
}

/** Numbers read by two worktrees before either writes: the race that the lock of `createAdr` removes. */
async function unlockedNumbers(): Promise<readonly LifecycleCode[]> {
  await using directory = await createTemporaryDirectory('adr-race');
  const main = join(directory.path, 'main');
  const other = join(directory.path, 'other');
  await materialize(main, { commits: [{ [ZERO]: proposed }] });
  await gitIn(main, ['worktree', 'add', '--quiet', '-b', 'other', other]);
  const [first, second] = await Promise.all([nextNumber(main), nextNumber(other)]);
  return first === second ? ['new/duplicate-number'] : [];
}

const WIRED_SETTINGS = join(REPOSITORY_ROOT, '.claude/settings.json');

async function settingsWiring(text: string): Promise<readonly LifecycleCode[]> {
  await Promise.resolve();
  const settings: unknown = JSON.parse(text);
  const hooks = isFields(settings) ? settings['hooks'] : undefined;
  const preToolUse = isFields(hooks) ? hooks['PreToolUse'] : undefined;
  const entries = Array.isArray(preToolUse) ? preToolUse.filter(isFields) : [];
  const wired = entries.some((entry) => {
    const matcher = typeof entry['matcher'] === 'string' ? entry['matcher'].split('|') : [];
    const commands = Array.isArray(entry['hooks']) ? entry['hooks'].filter(isFields) : [];
    return (
      ['Edit', 'Write', 'Bash'].every((tool) => matcher.includes(tool)) &&
      commands.some(
        (command) =>
          typeof command['command'] === 'string' && command['command'].includes('tools/adr/src/cli/agent-guard.ts'),
      )
    );
  });
  const permissions = isFields(settings) ? settings['permissions'] : undefined;
  const deny = isFields(permissions) && Array.isArray(permissions['deny']) ? permissions['deny'] : [];
  return wired && deny.includes('Bash(pnpm adr:decide *)') ? [] : ['hook/not-wired'];
}

export const LIFECYCLE_FIXTURES = [
  define('guard/decided-write', 'un agent réécrit un ADR accepté', ['guard/denied'], async () =>
    guardCall({ [ZERO]: accepted }, 'Write', (root) => ({
      file_path: join(root, ZERO),
      content: replaceOnce(accepted, 'alourdit le paquet', 'grossit le paquet'),
    })),
  ),
  define('guard/status-change', 'un agent passe un ADR proposé à accepted', ['guard/denied'], async () =>
    guardCall({ [ZERO]: proposed }, 'Edit', (root) => ({
      file_path: join(root, ZERO),
      old_string: 'status: proposed',
      new_string: 'status: accepted',
    })),
  ),
  define('guard/new-decided-file', 'un agent crée un ADR directement rejeté', ['guard/denied'], async () =>
    guardCall({}, 'Write', (root) => ({ file_path: join(root, ZERO), content: adrDocument({ status: 'rejected' }) })),
  ),
  define('guard/proposed-edit', 'un agent modifie le corps d’un ADR proposé', [], async () =>
    guardCall({ [ZERO]: proposed }, 'Edit', (root) => ({
      file_path: join(root, ZERO),
      old_string: 'alourdit le paquet',
      new_string: 'grossit le paquet',
    })),
  ),
  define('guard/decide-command', 'un agent lance adr:decide', ['guard/denied'], async () =>
    guardCall({}, 'Bash', () => ({ command: 'env -u CLAUDECODE pnpm adr:decide ADR-0000 accepted' })),
  ),
  define('guard/other-file', 'un agent écrit hors des fichiers ADR', [], async () =>
    guardCall({}, 'Write', (root) => ({ file_path: join(root, 'docs/adr/README.md'), content: 'status: accepted\n' })),
  ),
  define('decide/agent-refused', 'adr:decide lancé depuis une session d’agent', ['decide/refused'], async () =>
    decision({ commits: [{ [ZERO]: proposed }], bindings: passingBindings }, 'accepted', { CLAUDECODE: '1' }),
  ),
  define('decide/uncommitted-refused', 'adr:decide sur un ADR jamais commité', ['decide/refused'], async () =>
    decision({ worktree: { [ZERO]: proposed }, bindings: passingBindings }, 'accepted', {}),
  ),
  define(
    'decide/failing-proof-refused',
    'adr:decide accepte malgré une preuve en échec',
    ['decide/refused'],
    async () =>
      decision(
        {
          commits: [{ [ZERO]: proposed }],
          bindings: { 'ADR-0000': { scope: ['docs/adr/**'], rules: { R1: [FAKE_PROOFS.failing] } } },
        },
        'accepted',
        {},
      ),
  ),
  define('decide/accepts', 'adr:decide par un humain, preuves vertes', ['decide/decided'], async () =>
    decision({ commits: [{ [ZERO]: proposed }], bindings: passingBindings }, 'accepted', {}),
  ),
  define('decide/rejects', 'adr:decide rejette un ADR proposé sans liens', ['decide/decided'], async () =>
    decision({ commits: [{ [ZERO]: proposed }] }, 'rejected', {}),
  ),
  define('new/parallel-worktrees', 'deux worktrees créent un ADR en même temps', [], parallelNumbers),
  define(
    'new/unlocked-race',
    'deux lectures du prochain numéro sans verrou se chevauchent',
    ['new/duplicate-number'],
    unlockedNumbers,
  ),
  define('hook/settings-wired', 'le hook et les refus de .claude/settings.json sont branchés', [], async () =>
    settingsWiring(await readFile(WIRED_SETTINGS, 'utf8')),
  ),
  define('hook/settings-without-bash', 'un hook qui ne surveille pas Bash', ['hook/not-wired'], async () =>
    settingsWiring((await readFile(WIRED_SETTINGS, 'utf8')).replace('Edit|Write|Bash', 'Edit|Write')),
  ),
] as const;

export type LifecycleProofId = (typeof LIFECYCLE_FIXTURES)[number]['id'];
