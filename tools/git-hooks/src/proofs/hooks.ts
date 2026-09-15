import { chmod, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FixtureContext, RepositoryPlan } from '@huma/fixtures';
import { createRepository, FIXTURE_IDENTITY, fixtureFactory } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import type { GitRepository } from '@huma/kit/git';
import { capture } from '@huma/kit/process';
import { git, isolatedRepository, messageTrailers, writeTree } from '@huma/kit/git';
import { repoPath } from '@huma/kit/paths';
import type { GitHookCode } from '../checks.ts';
import { checkCommitHistory } from '../history.ts';
import type { InstallationContext } from '../installation.ts';
import { checkInstallation, installShims } from '../installation.ts';
import type { CommitPolicy, ExpectedRefs } from '../message.ts';
import { checkMessage, checkRefs } from '../message.ts';
import { renderShims } from '../shims.ts';
import { checkStaging } from '../staging.ts';
import { checkVerifiedTree, recordVerifiedTree } from '../tripwire.ts';
import type { Verification } from '../flows.ts';
import { applyPatchMessage, commitMessage, preCommit } from '../flows.ts';

const define = fixtureFactory<GitHookCode>();

const codes = (findings: readonly Readonly<{ code: GitHookCode }>[]): readonly GitHookCode[] =>
  findings.map((finding) => finding.code);

/** Runs `body` on a fixture repository created from `plan`, hooks enabled so that their configuration is visible. */
const inRepository =
  (plan: RepositoryPlan, body: (repository: GitRepository) => Promise<readonly GitHookCode[]>) =>
  async ({ signal }: FixtureContext): Promise<readonly GitHookCode[]> => {
    await using directory = await temporaryDirectory('hooks-fixture');
    const root = join(directory.path, 'depot');
    await createRepository(root, plan, { signal });
    return await body(isolatedRepository(root, { env: FIXTURE_IDENTITY, hooks: 'enabled', signal }));
  };

const COMMITTED: RepositoryPlan = { commits: [{ files: { 'a.txt': 'a\n', 'b.txt': 'b\n' }, message: 'feat: départ' }] };

const STAGING_FIXTURES = [
  define(
    'git/valid-staging',
    'un index qui contient tout l’arbre de travail',
    [],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) =>
      codes(await checkStaging(repository)),
    ),
  ),
  define(
    'git/unstaged',
    'un fichier modifié hors de l’index',
    ['git/unstaged'],
    inRepository(
      { ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' }, worktree: { 'a.txt': 'a2\n', 'b.txt': 'b2\n' } },
      async (repository) => codes(await checkStaging(repository)),
    ),
  ),
  define(
    'git/untracked',
    'un fichier non suivi',
    ['git/untracked'],
    inRepository({ ...COMMITTED, worktree: { 'a.txt': 'a\n', 'b.txt': 'b\n', 'c.txt': 'c\n' } }, async (repository) =>
      codes(await checkStaging(repository)),
    ),
  ),
  define(
    'git/index-flagged',
    'un fichier modifié caché par skip-worktree',
    ['git/index-flagged'],
    inRepository(COMMITTED, async (repository) => {
      await git(repository, ['update-index', '--skip-worktree', 'b.txt']);
      await writeFile(join(repository.root, 'b.txt'), 'caché\n');
      return codes(await checkStaging(repository));
    }),
  ),
  define(
    'git/unmerged',
    'un conflit de fusion non résolu',
    ['git/unmerged'],
    inRepository(COMMITTED, async (repository) => {
      await git(repository, ['switch', '--quiet', '-c', 'autre']);
      await writeFile(join(repository.root, 'a.txt'), 'autre\n');
      await git(repository, ['commit', '--quiet', '-am', 'fix: autre']);
      await git(repository, ['switch', '--quiet', 'main']);
      await writeFile(join(repository.root, 'a.txt'), 'principal\n');
      await git(repository, ['commit', '--quiet', '-am', 'fix: principal']);
      await git(repository, ['merge', '--quiet', 'autre'], { successCodes: [1] });
      return codes(await checkStaging(repository));
    }),
  ),
] as const;

const GIT_PROCESS = 4242;

const TRIPWIRE_FIXTURES = [
  define(
    'git/valid-verified-tree',
    'un commit dont pre-commit a vérifié l’index',
    [],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      await recordVerifiedTree(repository, GIT_PROCESS, await writeTree(repository));
      return codes(await checkVerifiedTree(repository, GIT_PROCESS));
    }),
  ),
  define(
    'git/verify-skipped',
    'un commit sans trace de pre-commit',
    ['git/verify-skipped'],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) =>
      codes(await checkVerifiedTree(repository, GIT_PROCESS)),
    ),
  ),
  define(
    'git/verify-skipped-index-changed',
    'un index modifié après pre-commit',
    ['git/verify-skipped'],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      await recordVerifiedTree(repository, GIT_PROCESS, await writeTree(repository));
      await writeFile(join(repository.root, 'b.txt'), 'b2\n');
      await git(repository, ['add', 'b.txt']);
      return codes(await checkVerifiedTree(repository, GIT_PROCESS));
    }),
  ),
  define(
    'git/verify-skipped-marker-reused',
    'un marqueur de pre-commit déjà consommé par un commit',
    ['git/verify-skipped'],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      await recordVerifiedTree(repository, GIT_PROCESS, await writeTree(repository));
      const first = await checkVerifiedTree(repository, GIT_PROCESS);
      return [...codes(first), ...codes(await checkVerifiedTree(repository, GIT_PROCESS))];
    }),
  ),
  define(
    'git/verify-skipped-marker-forged',
    'un marqueur écrit là où la garde des agents ne protège rien',
    ['git/verify-skipped'],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      const forged = join(repository.root, 'node_modules/.cache/huma/git-hooks');
      await mkdir(forged, { recursive: true });
      await writeFile(join(forged, String(GIT_PROCESS)), `${await writeTree(repository)}\n`);
      return codes(await checkVerifiedTree(repository, GIT_PROCESS));
    }),
  ),
  define(
    'git/valid-cherry-pick',
    'un cherry-pick que git écrit sans pre-commit',
    [],
    inRepository(COMMITTED, async (repository) => {
      await writeFile(join(repository.root, '.git/CHERRY_PICK_HEAD'), `${await writeTree(repository)}\n`);
      return codes(await checkVerifiedTree(repository, GIT_PROCESS));
    }),
  ),
] as const;

/** The entry the shims of the end-to-end fixtures run: the tripwire of this package, through real git hooks. */
const PROBE = fileURLToPath(new URL('probe.ts', import.meta.url));

/** A commit through real shims: pre-commit records the verified tree, prepare-commit-msg checks it. */
const committedThroughShims =
  (commitArguments: readonly string[]) =>
  async ({ signal }: FixtureContext): Promise<readonly GitHookCode[]> => {
    await using directory = await temporaryDirectory('hooks-fixture');
    const root = join(directory.path, 'depot');
    await createRepository(root, { ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, { signal });
    const repository = isolatedRepository(root, { env: FIXTURE_IDENTITY, hooks: 'enabled', signal });
    const shims = renderShims({ node: process.execPath, entry: PROBE, installer: 'la fixture' });
    await installShims({ repository, worktree: (other) => ({ ...repository, root: other }) }, shims);
    const committed = await capture('git', ['-C', root, 'commit', '--quiet', ...commitArguments], {
      cwd: root,
      env: repository.env,
      signal,
    });
    const refused = committed.exit.kind !== 'exited' || committed.exit.code !== 0;
    return refused && committed.stderr.toString('utf8').includes('git/verify-skipped') ? ['git/verify-skipped'] : [];
  };

const SHIM_FIXTURES = [
  define(
    'git/valid-commit-through-shims',
    'un commit ordinaire passe par les shims installés',
    [],
    committedThroughShims(['-m', 'feat: par les hooks']),
  ),
  define(
    'git/no-verify-through-shims',
    'git commit --no-verify est refusé par prepare-commit-msg',
    ['git/verify-skipped'],
    committedThroughShims(['--no-verify', '-m', 'feat: sans hooks']),
  ),
] as const;

const FIXTURE_COMMIT_POLICY: CommitPolicy = {
  types: ['feat', 'fix', 'docs'],
  scopes: new Set(['adr', 'kit']),
  maxHeaderLength: 72,
  refsKey: 'Refs',
  otherTrailers: ['Co-authored-by', 'BREAKING-CHANGE'],
};

/** The same policy for every commit of a fixture history. */
const FIXTURE_POLICY_AT = async (): Promise<CommitPolicy> => Promise.resolve(FIXTURE_COMMIT_POLICY);

const MESSAGE_PATH = repoPath('.git/COMMIT_EDITMSG');

type MessageOptions = Readonly<{ editor?: boolean; expected?: ExpectedRefs }>;

/** Checks a message as the commit-msg hook does, its trailers parsed by git. */
const checkedMessage =
  (message: string, options: MessageOptions = {}) =>
  async ({ signal }: FixtureContext): Promise<readonly GitHookCode[]> => {
    await using directory = await temporaryDirectory('hooks-message');
    const trailers = await messageTrailers(isolatedRepository(directory.path, { signal }), message);
    const input = {
      message,
      trailers,
      editor: options.editor ?? false,
      path: MESSAGE_PATH,
      commit: null,
    };
    return codes([
      ...checkMessage(input, FIXTURE_COMMIT_POLICY),
      ...(options.expected === undefined ? [] : checkRefs(input, options.expected, FIXTURE_COMMIT_POLICY)),
    ]);
  };

const ADR_1_REQUIRED: ExpectedRefs = { required: new Map([['ADR-0001', 'périmètre touché']]), allowed: new Set() };

const MESSAGE_FIXTURES = [
  define(
    'git/valid-message',
    'un message complet : en-tête, corps, trailers',
    [],
    checkedMessage(
      'feat(adr): ajouter la garde\n\nPourquoi.\n\nRefs: ADR-0001\nRefs: ADR-0002\nCo-authored-by: A <a@example.org>\n',
      {
        expected: { required: new Map([['ADR-0001', 'périmètre touché']]), allowed: new Set(['ADR-0002']) },
      },
    ),
  ),
  define(
    'git/valid-editor-comments',
    'un message d’éditeur dont git retirera les commentaires',
    [],
    checkedMessage('fix: corriger\n# Please enter the commit message\n#\n', { editor: true }),
  ),
  define('git/header', 'un en-tête sans type', ['git/header'], checkedMessage('ajouter la garde\n')),
  define('git/type', 'un type inconnu', ['git/type'], checkedMessage('update: ajouter\n')),
  define('git/scope', 'une portée inconnue', ['git/scope'], checkedMessage('feat(inconnue): ajouter\n')),
  define(
    'git/header-length',
    'un en-tête trop long',
    ['git/header-length'],
    checkedMessage(`feat: ${'a'.repeat(80)}\n`),
  ),
  define(
    'git/body-separator',
    'un corps collé à l’en-tête',
    ['git/body-separator'],
    checkedMessage('feat: x\ncorps\n'),
  ),
  define('git/not-canonical', 'des espaces en fin de ligne', ['git/not-canonical'], checkedMessage('feat: x  \n')),
  define(
    'git/comment-line',
    'une ligne # commitée avec -m',
    ['git/comment-line'],
    checkedMessage('feat: x\n\n# Conflicts:\n'),
  ),
  define(
    'git/control-character',
    'un caractère de contrôle',
    ['git/control-character'],
    checkedMessage(`feat: x\n\nsonnerie ${String.fromCodePoint(7)}\n`),
  ),
  define(
    'git/generated-message',
    'le message de fusion de git',
    ['git/generated-message'],
    checkedMessage("Merge branch 'autre'\n"),
  ),
  define(
    'git/generated-fixup',
    'une correction à fusionner, que seul un rebase sans pre-commit replierait',
    ['git/generated-message'],
    checkedMessage('fixup! feat: x\n'),
  ),
  define(
    'git/trailer-unknown',
    'un trailer inconnu',
    ['git/trailer-unknown'],
    checkedMessage('feat: x\n\nContexte: y\n'),
  ),
  define(
    'git/breaking-change-space',
    'BREAKING CHANGE avec une espace',
    ['git/breaking-change-space'],
    checkedMessage('feat: x\n\nBREAKING CHANGE: tout change\n'),
  ),
  define(
    'git/refs-format',
    'deux ADR dans un trailer',
    ['git/refs-format', 'git/refs-missing'],
    checkedMessage('feat: x\n\nRefs: ADR-0001, ADR-0002\n', { expected: ADR_1_REQUIRED }),
  ),
  define(
    'git/refs-order',
    'des trailers Refs dans le désordre',
    ['git/refs-order'],
    checkedMessage('feat: x\n\nRefs: ADR-0002\nRefs: ADR-0001\n'),
  ),
  define(
    'git/refs-missing',
    'un ADR requis non cité',
    ['git/refs-missing'],
    checkedMessage('feat: x\n', { expected: ADR_1_REQUIRED }),
  ),
  define(
    'git/refs-extra',
    'un ADR cité sans raison',
    ['git/refs-extra'],
    checkedMessage('feat: x\n\nRefs: ADR-0001\nRefs: ADR-0003\n', { expected: ADR_1_REQUIRED }),
  ),
  define(
    'git/refs-in-prose',
    'un Refs noyé dans la prose n’est pas un trailer',
    ['git/refs-missing'],
    checkedMessage('feat: x\n\nTrois lignes\nde prose\nRefs: ADR-0001\n', { expected: ADR_1_REQUIRED }),
  ),
] as const;

const passed = async (): Promise<Verification> => Promise.resolve({ kind: 'passed' });

const FLOW_FIXTURES = [
  define(
    'git/valid-pre-commit',
    'un pre-commit dont les contrôles passent sur l’index complet',
    [],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      const found = await preCommit({ repository, gitProcess: GIT_PROCESS, verify: passed });
      return [...codes(found), ...codes(await checkVerifiedTree(repository, GIT_PROCESS))];
    }),
  ),
  define(
    'git/verify-failed',
    'un pre-commit dont les contrôles échouent',
    ['git/verify-failed', 'git/verify-skipped'],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      const verify = async (): Promise<Verification> =>
        Promise.resolve({ kind: 'failed', step: 'lint', ending: 'code 1' });
      const found = await preCommit({ repository, gitProcess: GIT_PROCESS, verify });
      return [...codes(found), ...codes(await checkVerifiedTree(repository, GIT_PROCESS))];
    }),
  ),
  define(
    'git/tree-changed',
    'des contrôles qui modifient un fichier commité',
    ['git/tree-changed'],
    inRepository({ ...COMMITTED, staged: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      const verify = async (): Promise<Verification> => {
        await writeFile(join(repository.root, 'b.txt'), 'réécrit par un contrôle\n');
        return { kind: 'passed' };
      };
      return codes(await preCommit({ repository, gitProcess: GIT_PROCESS, verify }));
    }),
  ),
  define(
    'git/unstaged-before-checks',
    'un pre-commit refusé avant les contrôles quand l’index est partiel',
    ['git/unstaged'],
    inRepository({ ...COMMITTED, worktree: { 'a.txt': 'a2\n', 'b.txt': 'b\n' } }, async (repository) => {
      const verify = async (): Promise<Verification> => Promise.reject(new Error('contrôles lancés à tort'));
      return codes(await preCommit({ repository, gitProcess: GIT_PROCESS, verify }));
    }),
  ),
  define('git/patch-refused', 'git am refusé par applypatch-msg', ['git/patch-refused'], async () =>
    Promise.resolve(codes(applyPatchMessage())),
  ),
  define(
    'git/valid-amend-refs',
    'un amend dont les citations valent pour le commit amendé',
    [],
    inRepository(COMMITTED, async (repository) => {
      const messageFile = join(repository.root, '.git/COMMIT_EDITMSG');
      await writeFile(messageFile, 'fix(adr): corriger\n');
      const expectedRefs = async (base: 'HEAD' | 'HEAD^'): Promise<ExpectedRefs> =>
        Promise.resolve(base === 'HEAD' ? ADR_1_REQUIRED : { required: new Map(), allowed: new Set() });
      return codes(
        await commitMessage({
          repository,
          messageFile,
          editor: false,
          policy: FIXTURE_COMMIT_POLICY,
          expectedRefs,
        }),
      );
    }),
  ),
  define(
    'git/refs-missing-commit-msg',
    'un commit-msg qui refuse une citation manquante avant comme après HEAD^',
    ['git/refs-missing'],
    inRepository(COMMITTED, async (repository) => {
      const messageFile = join(repository.root, '.git/COMMIT_EDITMSG');
      await writeFile(messageFile, 'fix(adr): corriger\n');
      const expectedRefs = async (): Promise<ExpectedRefs> => Promise.resolve(ADR_1_REQUIRED);
      return codes(
        await commitMessage({
          repository,
          messageFile,
          editor: false,
          policy: FIXTURE_COMMIT_POLICY,
          expectedRefs,
        }),
      );
    }),
  ),
] as const;

const SHIMS = renderShims({
  node: 'node_modules/.bin/node',
  entry: 'tools/hooks/entry.ts',
  installer: 'pnpm hooks:install',
});

const installation = (repository: GitRepository): InstallationContext => ({
  repository,
  worktree: (root) => ({ ...repository, root }),
});

const installed = (change: (repository: GitRepository) => Promise<void>) =>
  inRepository(COMMITTED, async (repository) => {
    await installShims(installation(repository), SHIMS);
    await change(repository);
    return codes(await checkInstallation(installation(repository), SHIMS));
  });

const INSTALLATION_FIXTURES = [
  define(
    'git/valid-installation',
    'des shims installés tels que générés',
    [],
    installed(async () => Promise.resolve()),
  ),
  define(
    'git/hook-missing',
    'aucun shim installé',
    ['git/hook-missing'],
    inRepository(COMMITTED, async (repository) => codes(await checkInstallation(installation(repository), SHIMS))),
  ),
  define(
    'git/hook-modified',
    'un shim vidé',
    ['git/hook-modified'],
    installed(async (repository) => writeFile(join(repository.root, '.git/hooks/pre-commit'), '#!/bin/sh\n')),
  ),
  define(
    'git/hook-not-executable',
    'un shim sans droit d’exécution',
    ['git/hook-not-executable'],
    installed(async (repository) => chmod(join(repository.root, '.git/hooks/commit-msg'), 0o644)),
  ),
  define(
    'git/hook-unexpected',
    'un hook exécutable inconnu du dépôt',
    ['git/hook-unexpected'],
    installed(async (repository) =>
      writeFile(join(repository.root, '.git/hooks/post-commit'), '#!/bin/sh\n', { mode: 0o755 }),
    ),
  ),
  define(
    'git/hooks-directory-link',
    'un dossier des hooks remplacé par un lien',
    ['git/hooks-directory-link', 'git/hook-missing'],
    inRepository(COMMITTED, async (repository) => {
      await rm(join(repository.root, '.git/hooks'), { recursive: true, force: true });
      await mkdir(join(repository.root, 'vide'));
      await symlink(join(repository.root, 'vide'), join(repository.root, '.git/hooks'));
      return codes(await checkInstallation(installation(repository), SHIMS));
    }),
  ),
  define(
    'git/hooks-path',
    'core.hooksPath dans la configuration locale',
    ['git/hooks-path'],
    installed(async (repository) => git(repository, ['config', 'core.hooksPath', '/dev/null']).then(() => undefined)),
  ),
  define(
    'git/hooks-path-worktree',
    'core.hooksPath dans la configuration d’un worktree lié',
    ['git/hooks-path'],
    installed(async (repository) => {
      const linked = join(repository.root, '..', 'lie');
      await git(repository, ['worktree', 'add', '--quiet', '-b', 'lie', linked]);
      await git(repository, ['config', 'extensions.worktreeConfig', 'true']);
      await git({ ...repository, root: linked }, ['config', '--worktree', 'core.hooksPath', '/dev/null']);
    }),
  ),
  define(
    'git/config-include',
    'une configuration incluse selon la branche',
    ['git/config-include'],
    installed(async (repository) =>
      git(repository, ['config', 'includeIf.onbranch:autre.path', 'autre.cfg']).then(() => undefined),
    ),
  ),
  define(
    'git/install-refused-hooks-path',
    'une installation refusée tant que core.hooksPath détourne les hooks',
    ['git/hooks-path'],
    inRepository(COMMITTED, async (repository) => {
      await git(repository, ['config', 'core.hooksPath', '/dev/null']);
      const outcome = await installShims(installation(repository), SHIMS);
      return outcome.kind === 'refused' ? codes(outcome.findings) : [];
    }),
  ),
] as const;

const ANCHORED: RepositoryPlan = {
  commits: [
    { files: { 'a.txt': '1\n' }, message: 'état sans convention avant l’ancrage' },
    { files: { 'a.txt': '2\n' }, message: 'feat: ancrage' },
  ],
};

const history = (after: readonly string[], anchor: (repository: GitRepository) => Promise<string>) =>
  inRepository(ANCHORED, async (repository) => {
    const commit = await anchor(repository);
    for (const [index, message] of after.entries()) {
      await writeFile(join(repository.root, 'a.txt'), `${String(index + 3)}\n`);
      await git(repository, ['-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-am', message]);
    }
    return codes(await checkCommitHistory({ repository, anchor: commit, policyAt: FIXTURE_POLICY_AT }));
  });

const headAnchor = async (repository: GitRepository): Promise<string> =>
  (await git(repository, ['rev-parse', 'HEAD'])).trim();

const HISTORY_FIXTURES = [
  define(
    'git/valid-history',
    'des commits conformes après l’ancrage',
    [],
    history(['fix: suite', 'docs(adr): note'], headAnchor),
  ),
  define(
    'git/history-bypassed-commit',
    'un commit passé par core.hooksPath=/dev/null avec un message non conforme',
    ['git/header'],
    history(['sans convention'], headAnchor),
  ),
  define(
    'git/anchor-unknown',
    'un commit d’ancrage absent du dépôt',
    ['git/anchor-unknown'],
    history([], async () => Promise.resolve('0123456789abcdef0123456789abcdef01234567')),
  ),
  define(
    'git/anchor-not-ancestor',
    'un ancrage sur une branche que HEAD ne contient pas',
    ['git/anchor-not-ancestor'],
    history([], async (repository) => {
      await git(repository, ['switch', '--quiet', '-c', 'ailleurs']);
      await git(repository, ['commit', '--quiet', '--allow-empty', '-m', 'feat: ailleurs']);
      const anchor = await headAnchor(repository);
      await git(repository, ['switch', '--quiet', 'main']);
      return anchor;
    }),
  ),
  define(
    'git/history-replaced-commit',
    'un commit non conforme masqué par git replace',
    ['git/header'],
    inRepository(ANCHORED, async (repository) => {
      const anchor = await headAnchor(repository);
      await git(repository, [
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '--quiet',
        '--allow-empty',
        '-m',
        'sans convention',
      ]);
      const bad = await headAnchor(repository);
      const good = (
        await git(repository, ['commit-tree', `${bad}^{tree}`, '-p', anchor, '-m', 'feat: remplaçant'])
      ).trim();
      await git(repository, ['replace', bad, good]);
      return codes(await checkCommitHistory({ repository, anchor, policyAt: FIXTURE_POLICY_AT }));
    }),
  ),
  define(
    'git/history-shallow',
    'un clone superficiel',
    ['git/history-shallow'],
    inRepository(ANCHORED, async (repository) => {
      const clone = join(repository.root, '..', 'clone');
      await git(repository, ['clone', '--quiet', '--depth', '1', `file://${repository.root}`, clone]);
      const shallow = isolatedRepository(clone, { env: FIXTURE_IDENTITY, hooks: 'enabled' });
      return codes(
        await checkCommitHistory({
          repository: shallow,
          anchor: 'HEAD',
          policyAt: FIXTURE_POLICY_AT,
        }),
      );
    }),
  ),
] as const;

export const GIT_HOOK_FIXTURES = [
  ...STAGING_FIXTURES,
  ...FLOW_FIXTURES,
  ...TRIPWIRE_FIXTURES,
  ...SHIM_FIXTURES,
  ...MESSAGE_FIXTURES,
  ...INSTALLATION_FIXTURES,
  ...HISTORY_FIXTURES,
] as const;
