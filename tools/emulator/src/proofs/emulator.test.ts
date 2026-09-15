import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { EmulatorCode } from '../checks.ts';
import { EMULATOR_FIXTURES } from './emulator.ts';

test('every finding of the emulator commands is reached by a fixture', () => {
  expectTypeOf<Coverage<EmulatorCode, typeof EMULATOR_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each emulator fixture reports exactly its expected codes', EMULATOR_FIXTURES);
