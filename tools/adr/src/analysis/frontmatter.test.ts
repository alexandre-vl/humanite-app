import { expect, test } from 'vitest';
import { adrNumber } from '../model/identifiers.ts';
import { serializeFrontMatter } from './frontmatter.ts';

test('serializeFrontMatter orders significance as the spec and sorts supersedes without duplicates', () => {
  expect(
    serializeFrontMatter({
      format: 1,
      status: 'accepted',
      significance: ['reversal-cost', 'dependency'],
      supersedes: [adrNumber(12), adrNumber(3), adrNumber(12)],
    }),
  ).toBe('format: 1\nstatus: accepted\nsignificance: [dependency, reversal-cost]\nsupersedes: [ADR-0003, ADR-0012]');
  expect(serializeFrontMatter({ format: 1, status: 'proposed', significance: ['boundary'], supersedes: [] })).toBe(
    'format: 1\nstatus: proposed\nsignificance: [boundary]',
  );
});
