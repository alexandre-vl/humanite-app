import { FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, test } from 'vitest';
import { COMMIT_REFS_FIXTURES } from './commit-refs.ts';

describe.concurrent('each commit citation fixture reports exactly its expected codes', () => {
  test.each(COMMIT_REFS_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
