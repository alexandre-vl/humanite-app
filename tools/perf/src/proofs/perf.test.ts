import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { PerfCode } from '../check.ts';
import { PERF_FIXTURES } from './perf.ts';

test('every performance code is reached by a fixture', () => {
  expectTypeOf<Coverage<PerfCode, typeof PERF_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each performance fixture reports exactly its expected codes', PERF_FIXTURES);
