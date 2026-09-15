import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { GuardCode } from '../checks.ts';
import { ROOT_FIXTURES } from './root.ts';

test('every code of the root guard is reached by a fixture', () => {
  expectTypeOf<Coverage<GuardCode, typeof ROOT_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each root guard fixture reports exactly its expected codes', ROOT_FIXTURES);
