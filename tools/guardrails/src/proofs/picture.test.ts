import type { PictureCode } from '@huma/contracts';
import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import { PICTURE_FIXTURES } from './picture.ts';

/** A code no fixture reaches is a judging nobody has seen speak: the type refuses the list until every one is. */
test('every picture code is reached by a fixture', () => {
  expectTypeOf<Coverage<PictureCode, typeof PICTURE_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each picture fixture reports exactly its expected codes', PICTURE_FIXTURES);
