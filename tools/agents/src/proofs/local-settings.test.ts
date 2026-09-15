import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { LocalSettingsCode } from '../local-settings.ts';
import { LOCAL_SETTINGS_FIXTURES } from './local-settings.ts';

test('every local settings code is reached by a fixture', () => {
  expectTypeOf<Coverage<LocalSettingsCode, typeof LOCAL_SETTINGS_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each local settings fixture reports exactly its expected codes', LOCAL_SETTINGS_FIXTURES);
