import type { Coverage } from '@huma/fixtures';
import { uncoveredCodes } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expect, expectTypeOf, test } from 'vitest';
import type { LifecycleCode } from './lifecycle.ts';
import { LIFECYCLE_CODES, LIFECYCLE_FIXTURES } from './lifecycle.ts';

test('every lifecycle code is reached by at least one fixture', () => {
  expectTypeOf<Coverage<LifecycleCode, typeof LIFECYCLE_FIXTURES>>().toEqualTypeOf<true>();
  expect(uncoveredCodes(LIFECYCLE_CODES, LIFECYCLE_FIXTURES)).toEqual([]);
});

testFixtures('each lifecycle fixture reports exactly its expected codes', LIFECYCLE_FIXTURES);
