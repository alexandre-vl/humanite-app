import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { ExpoCode } from '../checks.ts';
import { EXPO_FIXTURES } from './typed-routes.ts';

test('every Expo code is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<ExpoCode, typeof EXPO_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(EXPO_FIXTURES)).toEqual([]);
});

describe.concurrent('each Expo fixture reports exactly its expected codes', () => {
  test.each(EXPO_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
