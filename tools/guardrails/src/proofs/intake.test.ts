import type { IntakeCode } from '@huma/contracts';
import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import { INTAKE_FIXTURES } from './intake.ts';

/** A code no fixture reaches is a judging nobody has seen speak: the type refuses the list until every one is. */
test('every intake code is reached by a fixture', () => {
  expectTypeOf<Coverage<IntakeCode, typeof INTAKE_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each intake fixture reports exactly its expected codes', INTAKE_FIXTURES);
