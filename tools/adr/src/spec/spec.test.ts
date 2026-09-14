import { expect, expectTypeOf, test } from 'vitest';
import { CHECK_CODES, checkMessage, CHECKS } from './checks.ts';
import { FORMAT_REGISTRY } from './formats/registry.ts';
import type { SectionKey } from './formats/types.ts';
import { RULE_LEVELS, SECTION_KEYS } from './formats/types.ts';
import { FORMAT_1 } from './formats/v1.ts';

test('format 1 lists every section exactly once', () => {
  expectTypeOf<(typeof FORMAT_1.sections)[number]['key']>().toEqualTypeOf<SectionKey>();
  expect(FORMAT_1.sections.map((section) => section.key).toSorted()).toEqual([...SECTION_KEYS].toSorted());
});

test('formats have increasing versions, the latest is the last, and a format cannot be changed at run time', () => {
  const versions = FORMAT_REGISTRY.formats.map((format) => format.version);
  expect(versions).toEqual(versions.toSorted((left, right) => left - right));
  expect(new Set(versions).size).toBe(versions.length);
  expect(FORMAT_REGISTRY.formats.at(-1)).toBe(FORMAT_REGISTRY.latest);
  expect(Object.isFrozen(FORMAT_1.limits)).toBe(true);
  expect(Reflect.set(FORMAT_1.limits, 'words', 1)).toBe(false);
});

test('every keyword level has its singular and plural forms, and the negative forms read NE verb PAS', () => {
  for (const format of FORMAT_REGISTRY.formats) {
    for (const level of RULE_LEVELS) {
      expect(format.keywords[level].forms).toHaveLength(2);
    }
    format.keywords.mustNot.forms.forEach((negative, number) => {
      expect(negative).toBe(`NE ${format.keywords.must.forms[number] ?? ''} PAS`);
    });
  }
});

test('every code is namespaced, and every message renders once its placeholders are filled', () => {
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
