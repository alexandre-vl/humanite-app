import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { LintCode } from '../checks.ts';
import { LINT_FIXTURES } from './lint.ts';

test('every lint code is reached by a fixture', () => {
  expectTypeOf<Coverage<LintCode, typeof LINT_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each lint fixture reports exactly its expected codes', LINT_FIXTURES);
