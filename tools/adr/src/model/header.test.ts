import { expect, test } from 'vitest';
import { headerLines, readCanonicalHeader, renderHeader } from './header.ts';
import { adrNumber } from './identifiers.ts';

test('headerLines orders significance as the spec and sorts supersedes without duplicates', () => {
  expect(
    headerLines({
      format: 1,
      status: 'accepted',
      significance: ['reversal-cost', 'dependency'],
      supersedes: [adrNumber(12), adrNumber(3), adrNumber(12)],
    }),
  ).toEqual([
    'format: 1',
    'status: accepted',
    'significance: [dependency, reversal-cost]',
    'supersedes: [ADR-0003, ADR-0012]',
  ]);
  expect(headerLines({ format: 1, status: 'proposed', significance: ['boundary'], supersedes: [] })).toEqual([
    'format: 1',
    'status: proposed',
    'significance: [boundary]',
  ]);
});

test('readCanonicalHeader reads only the exact canonical spelling', () => {
  const canonical = renderHeader({
    format: 1,
    status: 'proposed',
    significance: ['dependency'],
    supersedes: [adrNumber(2)],
  });
  expect(readCanonicalHeader(`${canonical}\n# Titre\n`)).toEqual({
    header: { format: 1, status: 'proposed', significance: ['dependency'], supersedes: [2] },
    length: canonical.length,
  });
  for (const variant of [
    canonical.replace('status: proposed', "status: 'proposed'"),
    canonical.replace('status: proposed', 'status: !!str proposed'),
    canonical.replace('status: proposed', 'status:  proposed'),
    canonical.replace('[dependency]', '[dependency, dependency]'),
    canonical.replace('supersedes: [ADR-0002]', 'supersedes: []'),
    canonical.replace('format: 1', 'format: 01'),
    canonical.replace('---\n', '--- \n'),
    `\u{FEFF}${canonical}`,
    canonical.replaceAll('\n', '\r\n'),
    canonical.replace('status: proposed\n', 'status: proposed\nstatus: accepted\n'),
    canonical.replace('status: proposed', 'status: proposed # accepted'),
  ]) {
    expect(readCanonicalHeader(variant)).toBeNull();
  }
});
