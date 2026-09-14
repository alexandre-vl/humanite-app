import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { expect, expectTypeOf, test } from 'vitest';
import type { LocalSettingsCode } from '../local-settings.ts';
import { LOCAL_SETTINGS_FIXTURES } from './local-settings.ts';

test('every local settings code is reached by a fixture, and every fixture passes', async () => {
  expectTypeOf<Coverage<LocalSettingsCode, typeof LOCAL_SETTINGS_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(LOCAL_SETTINGS_FIXTURES)).toEqual([]);
  for (const fixture of LOCAL_SETTINGS_FIXTURES) {
    expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
  }
});
