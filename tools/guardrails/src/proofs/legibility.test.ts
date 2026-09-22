import type { LegibilityCode } from '@huma/design-tokens';
import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import { LEGIBILITY_FIXTURES } from './legibility.ts';

/** A code no fixture reaches is a reading nobody has seen speak: the type refuses the list until every one is. */
test('every legibility code is reached by a fixture', () => {
  expectTypeOf<Coverage<LegibilityCode, typeof LEGIBILITY_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each legibility fixture reports exactly its expected codes', LEGIBILITY_FIXTURES);
