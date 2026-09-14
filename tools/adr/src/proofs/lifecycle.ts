import { writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FileTree } from '@huma/fixtures';
import { createRepository, fixtureFactory } from '@huma/fixtures';
import { formatForPath } from '@huma/kit/format';
import { temporaryDirectory } from '@huma/kit/fs';
import { format as prettierFormat } from 'prettier';
import { analyzeAdr } from '../analysis/analyze.ts';
import type { GitRepository } from '@huma/kit/git';
import { commonDirectory, git } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import type { Environment } from '@huma/kit/process';
import type { Bindings } from '../model/bindings.ts';
import { adrNumber } from '../model/identifiers.ts';
import { runChecks } from '../repository/check.ts';
import { FORMAT_1 } from '../spec/formats/v1.ts';
import type { DecidedStatus } from '../spec/statuses.ts';
import { createAdr, nextNumber, skeleton } from '../lifecycle/create.ts';
import { decide } from '../lifecycle/decide.ts';
import { judgeAdrWrite } from '../lifecycle/guard.ts';
import { slugify } from '../analysis/slug.ts';
import { ACCEPTED, adrDocument, BASE_TITLE, PROPOSED, replaceOnce, ZERO } from './documents.ts';
import { bindingsSource, FAKE_PROOFS, runFakeProof } from './runners.ts';

export const LIFECYCLE_CODES = [
  'guard/denied',
  'decide/refused',
  'decide/decided',
  'new/duplicate-number',
  'new/title-refused',
  'format/fingerprint-changed',
] as const;

export type LifecycleCode = (typeof LIFECYCLE_CODES)[number];

const define = fixtureFactory<LifecycleCode>();

const judged = (before: string | null, after: string | null) => async (): Promise<readonly LifecycleCode[]> =>
  Promise.resolve(judgeAdrWrite(before, after).kind === 'deny' ? ['guard/denied'] : []);

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** The base ADR with what a formatter rewrites: spaces in prose, a code block and a table after the rules. */
const UNFORMATTED = replaceOnce(
  replaceOnce(
    PROPOSED,
    'entre deux paquets.\n',
    'entre deux paquets.\n\n```ts\nconst  schema={a:1}\n```\n\n| a | b |\n|-|-|\n| 1 | 2 |\n',
  ),
  'sa locale française sur',
  'sa  locale française  sur',
);

const fingerprintOf = (text: string): string =>
  analyzeAdr({ path: ZERO, number: adrNumber(0), slug: slugify(BASE_TITLE), bytes: new TextEncoder().encode(text) })
    .document.fingerprint;

/** Codes of formatting `UNFORMATTED` with `format`: a formatter that changes nothing proves nothing, so it throws. */
async function formattedFingerprint(format: (text: string) => Promise<string>): Promise<readonly LifecycleCode[]> {
  const formatted = await format(UNFORMATTED);
  if (formatted === UNFORMATTED) {
    throw new Error('Le formateur n’a rien changé : la fixture ne prouve rien');
  }
  return fingerprintOf(formatted) === fingerprintOf(UNFORMATTED) ? [] : ['format/fingerprint-changed'];
}

const proven: Bindings = { 'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: [FAKE_PROOFS.passing] } } };

type DecisionFixture = Readonly<{
  commits?: readonly FileTree[];
  worktree?: FileTree;
  bindings?: Bindings;
  status?: DecidedStatus;
  environment?: Environment;
}>;

async function decision(fixture: DecisionFixture): Promise<readonly LifecycleCode[]> {
  await using directory = await temporaryDirectory('adr-decide');
  const repository = await createRepository(directory.path, {
    commits: (fixture.commits ?? []).map((files) => ({ files })),
    ...(fixture.worktree === undefined ? {} : { worktree: fixture.worktree }),
  });
  const source = bindingsSource(fixture.bindings ?? {});
  const check = async () =>
    runChecks({
      repository,
      source: 'worktree',
      bindings: source,
      runProof: runFakeProof,
      environment: {},
      acknowledgments: [],
    });
  const outcome = await decide({
    repository,
    number: adrNumber(0),
    status: fixture.status ?? 'accepted',
    bindings: source,
    runProof: runFakeProof,
    environment: fixture.environment ?? {},
    check,
    regenerate: async () => Promise.resolve(),
  });
  if (outcome.kind === 'refused') {
    return ['decide/refused'];
  }
  if (outcome.diagnostics.length > 0) {
    throw new Error(
      `Décision écrite mais les contrôles échouent ensuite : ${outcome.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return ['decide/decided'];
}

async function twoWorktrees(path: string): Promise<Readonly<{ main: GitRepository; other: GitRepository }>> {
  const main = await createRepository(join(path, 'main'), { commits: [{ files: { [ZERO]: PROPOSED } }] });
  const otherRoot = join(path, 'other');
  await git(main, ['worktree', 'add', '--quiet', '-b', 'other', otherRoot]);
  return { main, other: { root: otherRoot, env: main.env } };
}

/** Writes the skeleton as generated: fixture repositories have no formatter configuration. */
const format = async (path: RepoPath, text: string): Promise<string> => Promise.resolve(text);

export const LIFECYCLE_FIXTURES = [
  define(
    'guard/decided-write',
    'un agent réécrit un ADR accepté',
    ['guard/denied'],
    judged(ACCEPTED, replaceOnce(ACCEPTED, 'alourdit', 'grossit')),
  ),
  define(
    'guard/status-change',
    'un agent passe un ADR proposé à accepted',
    ['guard/denied'],
    judged(PROPOSED, ACCEPTED),
  ),
  define(
    'guard/new-decided-file',
    'un agent crée un ADR directement rejeté',
    ['guard/denied'],
    judged(null, adrDocument({ status: 'rejected' })),
  ),
  define(
    'guard/tagged-status',
    'un agent écrit status: !!str accepted',
    ['guard/denied'],
    judged(PROPOSED, replaceOnce(PROPOSED, 'status: proposed', 'status: !!str accepted')),
  ),
  define(
    'guard/escaped-status',
    'un agent écrit un statut échappé en YAML',
    ['guard/denied'],
    judged(PROPOSED, replaceOnce(PROPOSED, 'status: proposed', 'status: "acc\\u0065pted"')),
  ),
  define(
    'guard/non-canonical-proposed',
    'un agent écrit un en-tête proposé non canonique',
    ['guard/denied'],
    judged(PROPOSED, replaceOnce(PROPOSED, 'status: proposed', "status: 'proposed'")),
  ),
  define(
    'guard/proposed-edit',
    'un agent modifie le corps d’un ADR proposé',
    [],
    judged(PROPOSED, replaceOnce(PROPOSED, 'alourdit', 'grossit')),
  ),
  define(
    'guard/new-skeleton',
    'un agent crée un squelette proposé',
    [],
    judged(null, skeleton(FORMAT_1, 'Validation des données par Zod', ['dependency'])),
  ),
  define(
    'guard/escaped-decided-rewrite',
    'un agent réécrit en proposé un ADR dont le statut décidé est échappé',
    ['guard/denied'],
    judged(replaceOnce(PROPOSED, 'status: proposed', 'status: "acc\\u0065pted"'), PROPOSED),
  ),
  define(
    'guard/unknown-result',
    'une modification dont le résultat ne se calcule pas',
    ['guard/denied'],
    judged(PROPOSED, null),
  ),
  define('format/prettier-keeps-fingerprint', 'Prettier reformate un ADR sans changer son empreinte', [], async () =>
    formattedFingerprint(async (text) => formatForPath(REPOSITORY_ROOT, ZERO, text)),
  ),
  define(
    'format/embedded-code-changes-fingerprint',
    'un formatage qui réécrit les blocs de code change l’empreinte',
    ['format/fingerprint-changed'],
    async () =>
      formattedFingerprint(async (text) =>
        prettierFormat(text, { parser: 'markdown', embeddedLanguageFormatting: 'auto' }),
      ),
  ),

  define('decide/agent-refused', 'une décision depuis une session d’agent', ['decide/refused'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], bindings: proven, environment: { CLAUDECODE: '1' } }),
  ),
  define('decide/dirty-tree-refused', 'une décision avec un fichier non commité', ['decide/refused'], async () =>
    decision({
      commits: [{ [ZERO]: PROPOSED }],
      worktree: { [ZERO]: PROPOSED, 'notes.md': 'brouillon' },
      bindings: proven,
    }),
  ),
  define('decide/uncommitted-refused', 'une décision sur un ADR jamais commité', ['decide/refused'], async () =>
    decision({
      commits: [{ 'README.md': 'dépôt' }],
      worktree: { 'README.md': 'dépôt', [ZERO]: PROPOSED },
      bindings: proven,
    }),
  ),
  define('decide/failing-proof-refused', 'une acceptation avec une preuve en échec', ['decide/refused'], async () =>
    decision({
      commits: [{ [ZERO]: PROPOSED }],
      bindings: { 'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: [FAKE_PROOFS.failing] } } },
    }),
  ),
  define('decide/already-decided-refused', 'une décision sur un ADR déjà accepté', ['decide/refused'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }, { [ZERO]: ACCEPTED }], bindings: proven }),
  ),
  define('decide/accepts', 'une acceptation humaine aux preuves vertes', ['decide/decided'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], bindings: proven }),
  ),
  define('decide/rejects', 'un rejet humain sans liens', ['decide/decided'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], status: 'rejected' }),
  ),

  define('new/parallel-worktrees', 'deux worktrees créent un ADR en même temps', [], async () => {
    await using directory = await temporaryDirectory('adr-new');
    const { main, other } = await twoWorktrees(directory.path);
    const [first, second] = await Promise.all([
      createAdr({
        repository: main,
        spec: FORMAT_1,
        title: 'Premier sujet en parallèle',
        significance: ['dependency'],
        format,
      }),
      createAdr({
        repository: other,
        spec: FORMAT_1,
        title: 'Second sujet en parallèle',
        significance: ['dependency'],
        format,
      }),
    ]);
    return first.number === second.number ? ['new/duplicate-number'] : [];
  }),
  define('new/unlocked-race', 'deux lectures du prochain numéro sans verrou', ['new/duplicate-number'], async () => {
    await using directory = await temporaryDirectory('adr-race');
    const { main, other } = await twoWorktrees(directory.path);
    const [first, second] = await Promise.all([nextNumber(main), nextNumber(other)]);
    return first === second ? ['new/duplicate-number'] : [];
  }),
  define('new/stale-lock', 'un verrou laissé par un processus arrêté', [], async () => {
    await using directory = await temporaryDirectory('adr-lock');
    const repository = await createRepository(directory.path, { commits: [{ files: { [ZERO]: PROPOSED } }] });
    const deadPid = 2 ** 22 + 1;
    await writeFile(
      join(await commonDirectory(repository), 'adr-new.lock'),
      JSON.stringify({ pid: deadPid, host: hostname() }),
    );
    const creation = await createAdr({
      repository,
      spec: FORMAT_1,
      title: 'Sujet après un arrêt brutal',
      significance: ['dependency'],
      format,
    });
    return creation.number === adrNumber(1) ? [] : ['new/duplicate-number'];
  }),
  define('new/title-refused', 'un titre avec deux-points', ['new/title-refused'], async () => {
    await using directory = await temporaryDirectory('adr-title');
    const repository = await createRepository(directory.path, { commits: [{ files: { [ZERO]: PROPOSED } }] });
    try {
      await createAdr({
        repository,
        spec: FORMAT_1,
        title: 'Validation : données',
        significance: ['dependency'],
        format,
      });
      return [];
    } catch (error) {
      return Error.isError(error) && error.message.startsWith('Titre refusé') ? ['new/title-refused'] : [];
    }
  }),
] as const;

export type LifecycleProofId = (typeof LIFECYCLE_FIXTURES)[number]['id'];
