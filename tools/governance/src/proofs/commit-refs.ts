import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Bindings } from '@huma/adr/bindings';
import { ACCEPTED, adrDocument, ONE, PROPOSED, ZERO } from '@huma/adr/proof-documents';
import type { FileTree, FixtureContext, RepositoryPlan } from '@huma/fixtures';
import { createRepository, FIXTURE_IDENTITY, fixtureFactory } from '@huma/fixtures';
import type { GitHookCode } from '@huma/git-hooks/checks';
import { commitMessage } from '@huma/git-hooks/flows';
import { temporaryDirectory } from '@huma/kit/fs';
import { isolatedRepository } from '@huma/kit/git';
import { commitPolicy, DEFAULT_BRANCH } from '../commit-policy.ts';
import { expectedRefs } from '../commit-refs.ts';

const define = fixtureFactory<GitHookCode>();

/** ADR-0000 governs `src/**`: once accepted, a commit that changes a file there cites it. */
const BINDINGS: Bindings = { 'ADR-0000': { scope: { paths: ['src/**'] }, rules: { R1: ['proof/x'] } } };

const SOURCE: FileTree = {
  'src/a.ts': 'export {};\n',
  'tools/kit/b.ts': 'export {};\n',
  'tools/adr/c.ts': 'export {};\n',
};

/**
 * Codes of the commit-msg hook for `message` on a repository at `plan`, with the citations computed from the index and
 * the bindings above, as `pnpm git:hook commit-msg` computes them.
 */
const citations =
  (plan: RepositoryPlan, message: string) =>
  async ({ signal }: FixtureContext): Promise<readonly GitHookCode[]> => {
    await using directory = await temporaryDirectory('governance-refs');
    const root = join(directory.path, 'depot');
    await createRepository(root, plan, { signal });
    const repository = isolatedRepository(root, { env: FIXTURE_IDENTITY, signal });
    const messageFile = join(directory.path, 'COMMIT_EDITMSG');
    await writeFile(messageFile, message);
    const findings = await commitMessage({
      repository,
      messageFile,
      editor: false,
      defaultBranch: DEFAULT_BRANCH,
      policy: await commitPolicy(repository),
      expectedRefs: async (base) => expectedRefs(repository, base, BINDINGS),
    });
    return findings.map((finding) => finding.code);
  };

/** ADR-0000 proposed, then accepted, then an unrelated commit: an amend of `HEAD` would not touch the ADR either. */
const acceptedWith = (staged: FileTree): RepositoryPlan => ({
  commits: [
    { files: { [ZERO]: PROPOSED, ...SOURCE } },
    { files: { [ZERO]: ACCEPTED, ...SOURCE } },
    { files: { [ZERO]: ACCEPTED, ...SOURCE, 'notes.txt': 'suite\n' } },
  ],
  staged: { [ZERO]: ACCEPTED, ...SOURCE, 'notes.txt': 'suite\n', ...staged },
});

const CHANGED_SOURCE: FileTree = { 'src/a.ts': 'export const a = 1;\n' };

export const COMMIT_REFS_FIXTURES = [
  define(
    'git/refs-scope-required',
    'un commit dans le périmètre d’un ADR accepté qui ne le cite pas',
    ['git/refs-missing'],
    citations(acceptedWith(CHANGED_SOURCE), 'feat(kit): changer a\n'),
  ),
  define(
    'git/valid-refs-scope-cited',
    'un commit dans le périmètre d’un ADR accepté qui le cite',
    [],
    citations(acceptedWith(CHANGED_SOURCE), 'feat(kit): changer a\n\nRefs: ADR-0000\n'),
  ),
  define(
    'git/valid-refs-outside-scope',
    'un commit hors de tout périmètre, sans citation',
    [],
    citations(acceptedWith({ 'tools/kit/b.ts': 'export const b = 1;\n' }), 'feat(kit): changer b\n'),
  ),
  define(
    'git/valid-refs-proposed-scope',
    'un commit dans le périmètre d’un ADR seulement proposé, sans citation',
    [],
    citations(
      {
        commits: [{ files: { [ZERO]: PROPOSED, ...SOURCE } }],
        staged: { [ZERO]: PROPOSED, ...SOURCE, ...CHANGED_SOURCE },
      },
      'feat(kit): changer a\n',
    ),
  ),
  define(
    'git/refs-adr-file-required',
    'un commit qui modifie un ADR proposé sans le citer',
    ['git/refs-missing'],
    citations(
      {
        commits: [{ files: { [ZERO]: PROPOSED, ...SOURCE } }],
        staged: { [ZERO]: PROPOSED.replace('Zod', 'Zod 4'), ...SOURCE },
      },
      'docs(adr): préciser la version\n',
    ),
  ),
  define(
    'git/valid-refs-superseded-cited',
    'un ADR qui en remplace un autre cite aussi celui qu’il remplace',
    [],
    citations(
      acceptedWith({ [ONE]: adrDocument({ title: 'Validation des données par Valibot', supersedes: 'ADR-0000' }) }),
      'docs(adr): proposer ADR-0001\n\nRefs: ADR-0000\nRefs: ADR-0001\n',
    ),
  ),
  define(
    'git/refs-unrelated-cited',
    'un commit qui cite un ADR qu’il ne touche pas',
    ['git/refs-extra'],
    citations(acceptedWith({ 'tools/kit/b.ts': 'export const b = 1;\n' }), 'feat(kit): changer b\n\nRefs: ADR-0000\n'),
  ),
] as const;
