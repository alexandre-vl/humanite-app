import { readFile } from 'node:fs/promises';
import { FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, test } from 'vitest';
import { WORKSPACE_ROOTS } from '../commit-policy.ts';
import { COMMIT_REFS_FIXTURES } from './commit-refs.ts';

test('every package glob of the workspace sits under one of the roots that give commit scopes', async () => {
  const manifest = await readFile(new URL('../../../../pnpm-workspace.yaml', import.meta.url), 'utf8');
  const globs = [...manifest.matchAll(/^ {2}- (\S+)$/gmu)].map((match) => match[1] ?? '');
  expect(globs.length).toBeGreaterThan(0);
  for (const glob of globs) {
    expect(WORKSPACE_ROOTS.map((root) => `${root}/*`)).toContain(glob);
  }
});

describe.concurrent('each commit citation fixture reports exactly its expected codes', () => {
  test.each(COMMIT_REFS_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
