import type { ProseCode } from '@huma/contracts';
import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import { PROSE_FIXTURES } from './prose.ts';

/** A code no fixture reaches is a judging nobody has seen speak: the type refuses the list until every one is. */
test('every prose code is reached by a fixture', () => {
  expectTypeOf<Coverage<ProseCode, typeof PROSE_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each prose fixture reports exactly its expected codes', PROSE_FIXTURES);
