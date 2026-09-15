import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { DepsCode } from '../checks.ts';
import { DEPS_FIXTURES } from './deps.ts';

test('every dependency code is reached by a fixture', () => {
  expectTypeOf<Coverage<DepsCode, typeof DEPS_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each dependency fixture reports exactly its expected codes', DEPS_FIXTURES);
