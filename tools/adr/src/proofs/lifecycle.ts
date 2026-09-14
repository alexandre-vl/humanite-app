import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FileTree } from '@huma/fixtures';
import { createRepository, fixtureFactory, writeTree } from '@huma/fixtures';
import { formatForPath } from '@huma/kit/format';
import { readTextIfExists, temporaryDirectory } from '@huma/kit/fs';
import type { GitRepository } from '@huma/kit/git';
import { createRef, git } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import type { Environment } from '@huma/kit/process';
import { keysOf } from '@huma/kit/records';
import { format as prettierFormat } from 'prettier';
import { analyzeAdr } from '../analysis/analyze.ts';
import { slugify } from '../analysis/slug.ts';
import type { Creation } from '../lifecycle/create.ts';
import { createAdr, nextNumber, RESERVATIONS, skeleton } from '../lifecycle/create.ts';
import type { RefusalReason } from '../lifecycle/decide.ts';
import { decide, REFUSALS } from '../lifecycle/decide.ts';
import { judgeAdrWrite } from '../lifecycle/guard.ts';
import type { Bindings } from '../model/bindings.ts';
import { withoutEntries } from '../model/bindings.ts';
import { adrNumber } from '../model/identifiers.ts';
import { runChecks } from '../repository/check.ts';
import { FORMAT_1 } from '../spec/formats/v1.ts';
import type { DecidedStatus } from '../spec/statuses.ts';
import { ACCEPTED, adrDocument, BASE_TITLE, ONE, OTHER_TITLE, PROPOSED, replaceOnce, ZERO } from './documents.ts';
import { bindingsSource, FAKE_PROOFS, runFakeProof } from './runners.ts';

const DECISION_CODES = [...keysOf(REFUSALS).map((reason) => `decide/${reason}` as const), 'decide/decided'] as const;

export const LIFECYCLE_CODES = [
  'guard/denied',
  ...DECISION_CODES,
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

const provenBy = (proof: string) => ({ scope: { paths: ['docs/adr/**'] }, rules: { R1: [proof] } }) as const;

const proven: Bindings = { 'ADR-0000': provenBy(FAKE_PROOFS.passing) };

type DecisionFixture = Readonly<{
  commits?: readonly FileTree[];
  worktree?: FileTree;
  bindings?: Bindings;
  number?: number;
  status?: DecidedStatus;
  environment?: Environment;
  staleArtifacts?: readonly RepoPath[];
  /** Runs during the first check: the repository changes between the checks and the write. */
  duringFirstCheck?: (repository: GitRepository) => Promise<void>;
  /** What the regeneration of derived files writes. */
  regenerated?: FileTree;
  /** Runs once the outcome is known, to verify what the decision left on disk. */
  afterwards?: (repository: GitRepository, remainingBindings: Bindings) => Promise<void>;
}>;

async function decision(fixture: DecisionFixture): Promise<readonly LifecycleCode[]> {
  await using directory = await temporaryDirectory('adr-decide');
  const repository = await createRepository(directory.path, {
    commits: (fixture.commits ?? []).map((files) => ({ files })),
    ...(fixture.worktree === undefined ? {} : { worktree: fixture.worktree }),
  });
  let bindings = bindingsSource(fixture.bindings ?? {});
  let checks = 0;
  const outcome = await decide({
    repository,
    number: adrNumber(fixture.number ?? 0),
    status: fixture.status ?? 'accepted',
    bindings,
    runProof: runFakeProof,
    environment: fixture.environment ?? {},
    check: async (source) => {
      checks += 1;
      if (checks === 1) {
        await fixture.duringFirstCheck?.(repository);
      }
      return runChecks({
        repository,
        source: 'worktree',
        bindings: source,
        runProof: runFakeProof,
        environment: {},
        acknowledgments: [],
      });
    },
    staleArtifacts: async () => Promise.resolve(fixture.staleArtifacts ?? []),
    withoutBindings: (ids) => withoutEntries(bindings, ids),
    removeBindings: async (ids) => {
      bindings = withoutEntries(bindings, ids);
      return Promise.resolve([]);
    },
    regenerate: async () => {
      const files = fixture.regenerated ?? {};
      await writeTree(repository.root, files);
      return Object.keys(files).map((path) => ({ path: repoPath(path), previous: null }));
    },
  });
  await fixture.afterwards?.(repository, bindings.bindings);
  const code: `decide/${RefusalReason}` | 'decide/decided' =
    outcome.kind === 'refused' ? `decide/${outcome.reason}` : 'decide/decided';
  return [code];
}

async function twoWorktrees(path: string): Promise<Readonly<{ main: GitRepository; other: GitRepository }>> {
  const main = await createRepository(join(path, 'main'), { commits: [{ files: { [ZERO]: PROPOSED } }] });
  const otherRoot = join(path, 'other');
  await git(main, ['worktree', 'add', '--quiet', '-b', 'other', otherRoot]);
  return { main, other: { root: otherRoot, env: main.env } };
}

/** Writes the skeleton as generated: fixture repositories have no formatter configuration. */
const format = async (path: RepoPath, text: string): Promise<string> => Promise.resolve(text);

const creation = async (repository: GitRepository, title: string): Promise<Creation> =>
  createAdr({ repository, spec: FORMAT_1, title, significance: ['dependency'], format });

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

  define('decide/agent-refused', 'une décision depuis une session d’agent', ['decide/agent-session'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], bindings: proven, environment: { CLAUDECODE: '1' } }),
  ),
  define('decide/dirty-tree-refused', 'une décision avec un fichier non commité', ['decide/dirty-tree'], async () =>
    decision({
      commits: [{ [ZERO]: PROPOSED }],
      worktree: { [ZERO]: PROPOSED, 'notes.md': 'brouillon' },
      bindings: proven,
    }),
  ),
  define(
    'decide/stale-artifacts-refused',
    'une décision avec des fichiers dérivés périmés',
    ['decide/artifacts-stale'],
    async () =>
      decision({ commits: [{ [ZERO]: PROPOSED }], bindings: proven, staleArtifacts: [repoPath('docs/adr/README.md')] }),
  ),
  define('decide/failing-checks-refused', 'une décision sur un dépôt en erreur', ['decide/checks-failing'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], bindings: { 'ADR-0000': provenBy('fake/inconnue') } }),
  ),
  define('decide/unknown-adr-refused', 'une décision sur un numéro sans ADR', ['decide/not-found'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], bindings: proven, number: 1 }),
  ),
  define(
    'decide/already-decided-refused',
    'une décision sur un ADR déjà accepté',
    ['decide/already-decided'],
    async () => decision({ commits: [{ [ZERO]: PROPOSED }, { [ZERO]: ACCEPTED }], bindings: proven }),
  ),
  define(
    'decide/unbound-acceptance-refused',
    'une acceptation sans liens vers des preuves',
    ['decide/simulated-findings'],
    async () => decision({ commits: [{ [ZERO]: PROPOSED }] }),
  ),
  define(
    'decide/failing-proof-refused',
    'une acceptation avec une preuve en échec',
    ['decide/proofs-failing'],
    async () => decision({ commits: [{ [ZERO]: PROPOSED }], bindings: { 'ADR-0000': provenBy(FAKE_PROOFS.failing) } }),
  ),
  define(
    'decide/concurrent-change-refused',
    'un fichier écrit pendant les vérifications',
    ['decide/repository-changed'],
    async () =>
      decision({
        commits: [{ [ZERO]: PROPOSED }],
        bindings: proven,
        duringFirstCheck: async (repository) => writeTree(repository.root, { 'notes.md': 'écrit entre-temps' }),
      }),
  ),
  define(
    'decide/failing-result-undone',
    'une décision dont le résultat échoue aux contrôles est défaite',
    ['decide/post-check-failing'],
    async () =>
      decision({
        commits: [{ [ZERO]: PROPOSED }],
        bindings: proven,
        regenerated: { 'docs/adr/brouillon.md': 'fichier dérivé fautif' },
        afterwards: async (repository) => {
          if ((await readFile(join(repository.root, ZERO), 'utf8')) !== PROPOSED) {
            throw new Error('ADR laissé décidé après une décision défaite');
          }
          if ((await readTextIfExists(join(repository.root, 'docs/adr/brouillon.md'))) !== null) {
            throw new Error('fichier dérivé laissé après une décision défaite');
          }
        },
      }),
  ),
  define('decide/accepts', 'une acceptation humaine aux preuves vertes', ['decide/decided'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], bindings: proven }),
  ),
  define('decide/rejects', 'un rejet humain sans liens', ['decide/decided'], async () =>
    decision({ commits: [{ [ZERO]: PROPOSED }], status: 'rejected' }),
  ),
  define(
    'decide/accepts-superseding',
    'une acceptation qui remplace un ADR accepté retire ses liens',
    ['decide/decided'],
    async () =>
      decision({
        commits: [
          { [ZERO]: PROPOSED },
          { [ZERO]: ACCEPTED },
          { [ZERO]: ACCEPTED, [ONE]: adrDocument({ title: OTHER_TITLE, supersedes: 'ADR-0000' }) },
        ],
        bindings: { 'ADR-0000': provenBy(FAKE_PROOFS.passing), 'ADR-0001': provenBy(FAKE_PROOFS.passing) },
        number: 1,
        afterwards: async (repository, remaining) => {
          if (Object.hasOwn(remaining, 'ADR-0000') || !Object.hasOwn(remaining, 'ADR-0001')) {
            throw new Error(`Liens restants inattendus : ${Object.keys(remaining).join(', ')}`);
          }
          if (!(await readFile(join(repository.root, ONE), 'utf8')).includes('status: accepted')) {
            throw new Error('ADR-0001 non accepté');
          }
        },
      }),
  ),

  define('new/parallel-worktrees', 'deux worktrees créent un ADR en même temps', [], async () => {
    await using directory = await temporaryDirectory('adr-new');
    const { main, other } = await twoWorktrees(directory.path);
    const [first, second] = await Promise.all([
      creation(main, 'Premier sujet en parallèle'),
      creation(other, 'Second sujet en parallèle'),
    ]);
    return first.number === second.number ? ['new/duplicate-number'] : [];
  }),
  define('new/parallel-creations', 'six créations lancées ensemble dans un dépôt', [], async () => {
    await using directory = await temporaryDirectory('adr-many');
    const repository = await createRepository(directory.path, { commits: [{ files: { [ZERO]: PROPOSED } }] });
    const titles = ['Sujet un', 'Sujet deux', 'Sujet trois', 'Sujet quatre', 'Sujet cinq', 'Sujet six'];
    const numbers = (await Promise.all(titles.map(async (title) => creation(repository, title)))).map(
      (created) => created.number,
    );
    return new Set(numbers).size === numbers.length ? [] : ['new/duplicate-number'];
  }),
  define(
    'new/unreserved-race',
    'deux lectures du prochain numéro sans réservation',
    ['new/duplicate-number'],
    async () => {
      await using directory = await temporaryDirectory('adr-race');
      const { main, other } = await twoWorktrees(directory.path);
      const [first, second] = await Promise.all([nextNumber(main), nextNumber(other)]);
      return first === second ? ['new/duplicate-number'] : [];
    },
  ),
  define('new/reserved-number-skipped', 'un numéro réservé sans fichier n’est pas redonné', [], async () => {
    await using directory = await temporaryDirectory('adr-reserved');
    const repository = await createRepository(directory.path, { commits: [{ files: { [ZERO]: PROPOSED } }] });
    const note = (await git(repository, ['hash-object', '-w', '--stdin'], { input: 'réservé\n' })).trim();
    await createRef(repository, `${RESERVATIONS}/ADR-0001`, note);
    const created = await creation(repository, 'Sujet après une réservation');
    return created.number === adrNumber(2) ? [] : ['new/duplicate-number'];
  }),
  define('new/abandoned-number-kept', 'un ADR créé puis effacé ne rend pas son numéro', [], async () => {
    await using directory = await temporaryDirectory('adr-abandoned');
    const repository = await createRepository(directory.path, { commits: [{ files: { [ZERO]: PROPOSED } }] });
    const abandoned = await creation(repository, 'Sujet abandonné');
    await rm(join(repository.root, abandoned.path));
    const next = await creation(repository, 'Sujet suivant');
    return next.number === abandoned.number ? ['new/duplicate-number'] : [];
  }),
  define('new/title-refused', 'un titre avec deux-points', ['new/title-refused'], async () => {
    await using directory = await temporaryDirectory('adr-title');
    const repository = await createRepository(directory.path, { commits: [{ files: { [ZERO]: PROPOSED } }] });
    try {
      await creation(repository, 'Validation : données');
      return [];
    } catch (error) {
      return Error.isError(error) && error.message.startsWith('Titre refusé') ? ['new/title-refused'] : [];
    }
  }),
] as const;

export type LifecycleProofId = (typeof LIFECYCLE_FIXTURES)[number]['id'];
