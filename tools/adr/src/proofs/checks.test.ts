import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { CheckCode } from '../spec/checks.ts';
import { CHECK_CODES } from '../spec/checks.ts';
import { CHECK_FIXTURES } from './checks.ts';

test('every check code is proven by at least one fixture', () => {
  expectTypeOf<Coverage<CheckCode, typeof CHECK_FIXTURES>>().toEqualTypeOf<true>();
  const expected = new Set(CHECK_FIXTURES.flatMap((fixture) => fixture.expected));
  expect(CHECK_CODES.filter((code) => !expected.has(code))).toEqual([]);
});

test('fixture ids are unique', () => {
  expect(findDuplicateIds(CHECK_FIXTURES)).toEqual([]);
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

describe.concurrent('each fixture reports exactly its expected codes', () => {
  test.each(CHECK_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toMatchObject({ id: fixture.id, outcome: 'passed' });
    },
    60_000,
  );
});
