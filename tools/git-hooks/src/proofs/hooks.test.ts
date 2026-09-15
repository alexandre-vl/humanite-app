import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { GitHookCode } from '../checks.ts';
import { GIT_HOOK_FIXTURES } from './hooks.ts';

test('every hook code is reached by a fixture', () => {
  expectTypeOf<Coverage<GitHookCode, typeof GIT_HOOK_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each hook fixture reports exactly its expected codes', GIT_HOOK_FIXTURES);
