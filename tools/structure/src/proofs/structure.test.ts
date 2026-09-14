import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { StructureCode } from '../checks.ts';
import { unclassifiedSteigerRules } from '../steiger.ts';
import { STRUCTURE_FIXTURES } from './structure.ts';

test('every structure code is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<StructureCode, typeof STRUCTURE_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(STRUCTURE_FIXTURES)).toEqual([]);
});

test('every rule of the Steiger plugin is classified, and only its rules', () => {
  expect(unclassifiedSteigerRules()).toEqual({ missing: [], unknown: [] });
});

// One after the other: Steiger keeps one configuration per process.
describe('each structure fixture reports exactly its expected codes', () => {
  test.each(STRUCTURE_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
