import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expect, expectTypeOf, test } from 'vitest';
import type { StructureCode } from '../checks.ts';
import { unclassifiedSteigerRules } from '../steiger.ts';
import { STRUCTURE_FIXTURES } from './structure.ts';

test('every structure code is reached by a fixture', () => {
  expectTypeOf<Coverage<StructureCode, typeof STRUCTURE_FIXTURES>>().toEqualTypeOf<true>();
});

test('every rule of the Steiger plugin is classified, and only its rules', () => {
  expect(unclassifiedSteigerRules()).toEqual({ missing: [], unknown: [] });
});

testFixtures('each structure fixture reports exactly its expected codes', STRUCTURE_FIXTURES);
