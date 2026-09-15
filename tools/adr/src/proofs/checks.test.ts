import type { Coverage } from '@huma/fixtures';
import { runFixture, uncoveredCodes } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expect, expectTypeOf, test } from 'vitest';
import type { CheckCode } from '../spec/checks.ts';
import { CHECK_CODES } from '../spec/checks.ts';
import { CHECK_FIXTURES } from './checks.ts';

test('every check code is proven by at least one fixture', () => {
  expectTypeOf<Coverage<CheckCode, typeof CHECK_FIXTURES>>().toEqualTypeOf<true>();
  expect(uncoveredCodes(CHECK_CODES, CHECK_FIXTURES)).toEqual([]);
});

test('a fixture that expects another code fails and names both codes', async () => {
  const slug = CHECK_FIXTURES.find((fixture) => fixture.id === 'adr/slug-mismatch');
  expect(slug).toBeDefined();
  if (slug !== undefined) {
    expect(await runFixture({ ...slug, expected: ['adr/title-too-long'] })).toMatchObject({
      outcome: 'failed',
      missing: ['adr/title-too-long'],
      unexpected: ['adr/slug-mismatch'],
    });
  }
});

testFixtures('each fixture reports exactly its expected codes', CHECK_FIXTURES);
