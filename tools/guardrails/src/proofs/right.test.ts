import type { RightCode } from '@huma/contracts';
import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import { RIGHT_FIXTURES } from './right.ts';

/** A code no fixture reaches is a judging nobody has seen speak: the type refuses the list until every one is. */
test('every right code is reached by a fixture', () => {
  expectTypeOf<Coverage<RightCode, typeof RIGHT_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each right fixture reports exactly its expected codes', RIGHT_FIXTURES);
