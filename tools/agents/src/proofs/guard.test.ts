import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, FIXTURE_TEST_TIMEOUT_MS, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { AgentCode } from './guard.ts';
import { AGENT_FIXTURES } from './guard.ts';

test('every agent code is reached by a fixture, and fixture ids are unique', () => {
  expectTypeOf<Coverage<AgentCode, typeof AGENT_FIXTURES>>().toEqualTypeOf<true>();
  expect(findDuplicateIds(AGENT_FIXTURES)).toEqual([]);
});

describe.concurrent('each agent fixture reports exactly its expected codes', () => {
  test.each(AGENT_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    FIXTURE_TEST_TIMEOUT_MS,
  );
});
