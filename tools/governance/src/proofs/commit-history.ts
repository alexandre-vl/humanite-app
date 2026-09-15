import { join } from 'node:path';
import type { FixtureCommit, FixtureContext } from '@huma/fixtures';
import { createRepository, fixtureFactory } from '@huma/fixtures';
import type { GitHookCode } from '@huma/git-hooks/checks';
import { checkCommitHistory } from '@huma/git-hooks/history';
import { temporaryDirectory } from '@huma/kit/fs';
import { historicalCommitPolicy } from '../commit-policy.ts';

const define = fixtureFactory<GitHookCode>();

/**
 * Codes of the history check on a repository that went through `commits`, anchored at the first one, each later
 * commit judged under the policy it was made under, as `pnpm hooks:check` judges them.
 */
const historyOf =
  (commits: readonly [FixtureCommit, ...FixtureCommit[]]) =>
  async ({ signal }: FixtureContext): Promise<readonly GitHookCode[]> => {
    await using directory = await temporaryDirectory('governance-history');
    const repository = await createRepository(join(directory.path, 'depot'), { commits }, { signal });
    const findings = await checkCommitHistory({
      repository,
      anchor: `HEAD~${String(commits.length - 1)}`,
      policyAt: historicalCommitPolicy(repository),
    });
    return findings.map((finding) => finding.code);
  };

export const COMMIT_HISTORY_FIXTURES = [
  define(
    'git/valid-history-removed-package',
    'des commits qui nomment un paquet retiré depuis, jusqu’au commit qui le retire',
    [],
    historyOf([
      { files: { 'README.md': 'r\n', 'tools/old/a.ts': 'export {};\n' }, message: 'état avant l’ancrage' },
      { files: { 'README.md': 'r\n', 'tools/old/a.ts': 'export const a = 1;\n' }, message: 'feat(old): changer a' },
      {
        files: { 'README.md': 'r\n', 'tools/new/a.ts': 'export const a = 1;\n' },
        message: 'refactor(old): le retirer',
      },
      { files: { 'README.md': 's\n', 'tools/new/a.ts': 'export const a = 1;\n' }, message: 'docs: suite' },
    ]),
  ),
  define(
    'git/scope-before-package',
    'un commit qui nomme un paquet que son arbre ne contient pas encore',
    ['git/scope'],
    historyOf([
      { files: { 'README.md': 'r\n' }, message: 'état avant l’ancrage' },
      { files: { 'README.md': 's\n' }, message: 'feat(new): annoncer' },
      { files: { 'README.md': 's\n', 'tools/new/a.ts': 'export {};\n' }, message: 'feat(new): créer' },
    ]),
  ),
] as const;
