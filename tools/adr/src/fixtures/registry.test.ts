import type { Coverage } from '@huma/fixtures';
import { findDuplicateIds, runFixture } from '@huma/fixtures';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { CheckCode } from '../diagnostics.ts';
import { ADR_FIXTURES } from './registry.ts';

test('every check code is proven by at least one fixture', () => {
  expectTypeOf<Coverage<CheckCode, typeof ADR_FIXTURES>>().toEqualTypeOf<true>();
});

test('fixture ids are unique', () => {
  expect(findDuplicateIds(ADR_FIXTURES)).toEqual([]);
});

test('a fixture expecting another code fails with both codes named', async () => {
  const slug = ADR_FIXTURES.find((fixture) => fixture.id === 'adr/slug');
  expect(slug).toBeDefined();
  if (slug === undefined) {
    return;
  }
  const report = await runFixture({ ...slug, expected: ['adr/title'] });
  expect(report).toEqual({ id: 'adr/slug', outcome: 'failed', missing: ['adr/title'], unexpected: ['adr/slug'] });
}, 60_000);

describe.concurrent('each fixture reports exactly its expected codes', () => {
  test.each(ADR_FIXTURES)(
    '$id',
    async (fixture) => {
      expect(await runFixture(fixture)).toEqual({ id: fixture.id, outcome: 'passed' });
    },
    60_000,
  );
});
