import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import type { ArtworkCode } from '@huma/mock-content/artwork';
import { expectTypeOf, test } from 'vitest';
import { ARTWORK_FIXTURES } from './artwork.ts';

/** A code no fixture reaches is a reading nobody has seen speak: the type refuses the list until every one is. */
test('every artwork code is reached by a fixture', () => {
  expectTypeOf<Coverage<ArtworkCode, typeof ARTWORK_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each artwork fixture reports exactly its expected codes', ARTWORK_FIXTURES);
