import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { ExpoCode } from '../checks.ts';
import { EXPO_FIXTURES } from './typed-routes.ts';

test('every Expo code is reached by a fixture', () => {
  expectTypeOf<Coverage<ExpoCode, typeof EXPO_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each Expo fixture reports exactly its expected codes', EXPO_FIXTURES);
