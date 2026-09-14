import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { GitHookCode } from '../checks.ts';
import { GIT_HOOK_FIXTURES } from './hooks.ts';

test('every hook code is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<GitHookCode, typeof GIT_HOOK_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(GIT_HOOK_FIXTURES)).toEqual([]);
});

describe.concurrent('each hook fixture reports exactly its expected codes', () => {
  test.each(GIT_HOOK_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
