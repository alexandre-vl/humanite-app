import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { AgentCode } from '../checks.ts';
import { AGENT_FIXTURES } from './guard.ts';

test('every rule of the guard is reached by a fixture', () => {
  expectTypeOf<Coverage<AgentCode, typeof AGENT_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each agent fixture reports exactly its expected codes', AGENT_FIXTURES);
