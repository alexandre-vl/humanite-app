import { findWorkspaceRoot } from '@huma/kit/cli';
import { listFiles, ownRepository } from '@huma/kit/git';
import { expect, test } from 'vitest';
import { EXTRA_SCOPES, packageDirectories } from './commit-policy.ts';

test('no extra scope shares its name with a package directory, which would give one scope two meanings', async () => {
  const repository = ownRepository(await findWorkspaceRoot(import.meta.dirname));
  const packages = packageDirectories(await listFiles(repository, 'worktree'));
  expect(EXTRA_SCOPES.filter((scope) => packages.has(scope))).toEqual([]);
});

test('a package directory is a directory holding a file under a workspace root', () => {
  expect([
    ...packageDirectories(['tools/kit/src/a.ts', 'tools/README.md', 'docs/adr/x.md', 'apps/mobile/b.ts']),
  ]).toEqual(['kit', 'mobile']);
});
