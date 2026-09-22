import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { SecretCode } from '../secrets.ts';
import { SECRET_FIXTURES } from './secrets.ts';

/** A code no fixture reaches is a reading nobody has seen speak: the type refuses the list until every one is. */
test('every secret code is reached by a fixture', () => {
  expectTypeOf<Coverage<SecretCode, typeof SECRET_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each secret fixture reports exactly its expected codes', SECRET_FIXTURES);
