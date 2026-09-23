import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import type { TransportCode } from '@huma/remote-api/judge';
import { expectTypeOf, test } from 'vitest';
import { TRANSPORT_FIXTURES } from './transport.ts';

/** A code no fixture reaches is a judging nobody has seen speak: the type refuses the list until every one is. */
test('every transport code is reached by a fixture', () => {
  expectTypeOf<Coverage<TransportCode, typeof TRANSPORT_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each transport fixture reports exactly its expected codes', TRANSPORT_FIXTURES);
