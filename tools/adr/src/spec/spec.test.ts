import { expect, expectTypeOf, test } from 'vitest';
import { CHECK_CODES, checkMessage, CHECKS } from './checks.ts';
import { FORMAT_REGISTRY } from './formats/registry.ts';
import type { SectionKey } from './formats/types.ts';
import { SECTION_KEYS } from './formats/types.ts';
import { FORMAT_1 } from './formats/v1.ts';

test('format 1 lists every section exactly once', () => {
  expectTypeOf<(typeof FORMAT_1.sections)[number]['key']>().toEqualTypeOf<SectionKey>();
  expect(FORMAT_1.sections.map((section) => section.key).toSorted()).toEqual([...SECTION_KEYS].toSorted());
});

test('published formats have distinct versions and the latest is published', () => {
  const versions = FORMAT_REGISTRY.formats.map((format) => format.version);
  expect(new Set(versions).size).toBe(versions.length);
  expect(FORMAT_REGISTRY.formats).toContain(FORMAT_REGISTRY.latest);
});

test('every message placeholder is a word and every code is namespaced', () => {
  for (const code of CHECK_CODES) {
    expect(code).toMatch(/^adr\/[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    expect(CHECKS[code].message.replaceAll(/\{\w+\}/gu, '')).not.toMatch(/[{}]/u);
  }
});

test('checkMessage fills placeholders and joins lists', () => {
  expect(checkMessage('adr/title-too-long', { length: 72, max: 60 })).toBe('titre de 72 caractères : 60 au plus');
  expect(checkMessage('adr/number-duplicate', { id: 'ADR-0001', paths: ['a.md', 'b.md'] })).toBe(
    'ADR-0001 porté par plusieurs fichiers : a.md, b.md',
  );
});
