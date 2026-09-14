import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { DepsCode } from '../checks.ts';
import { DEPS_FIXTURES } from './deps.ts';

test('every dependency code is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<DepsCode, typeof DEPS_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(DEPS_FIXTURES)).toEqual([]);
});

describe('each dependency fixture reports exactly its expected codes', () => {
  test.each(DEPS_FIXTURES)('$id', async (fixture) => {
    expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
  });
});
