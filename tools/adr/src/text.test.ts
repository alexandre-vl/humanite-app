import { describe, expect, test } from 'vitest';
import { serializeFrontMatter } from './frontmatter.ts';
import { countWords, parseMarkdown, plainText, structuralFingerprint } from './markdown.ts';
import { adrNumber } from './model.ts';
import { slugify } from './slug.ts';

describe('slugify', () => {
  test.each([
    ['Décisions d’architecture en ADR vérifiés', 'decisions-d-architecture-en-adr-verifies'],
    ['Cœur du système, étape 2', 'coeur-du-systeme-etape-2'],
    ['Routes hors src et couche _app', 'routes-hors-src-et-couche-app'],
    ['  Espaces   et « guillemets »  ', 'espaces-et-guillemets'],
    ['!!!', ''],
  ])('%s → %s', (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });
});

describe('countWords', () => {
  test('counts text and inline code, not code blocks nor front matter', () => {
    const markdown = [
      '---',
      'format: 1',
      '---',
      '',
      '# L’app et ADR-0000',
      '',
      'Lancer `pnpm adr:check` sur garde-fous.',
      '',
      '```bash',
      'echo ces mots ne comptent pas',
      '```',
      '',
      '| Col | Valeur |',
      '| --- | --- |',
      '| a | b |',
    ].join('\n');
    // L’app, et, ADR-0000 (3) · Lancer, pnpm, adr, check, sur, garde-fous (6) · Col, Valeur, a, b (4)
    expect(countWords(parseMarkdown(markdown))).toBe(13);
  });
});

test('plainText collapses non-breaking spaces and masks inline code on request', () => {
  const [paragraph] = parseMarkdown('Option retenue\u{A0}: «\u{202F}`Zod` », parce que\n**oui**.').children;
  expect(paragraph).toBeDefined();
  if (paragraph === undefined) {
    return;
  }
  expect(plainText(paragraph, 'keep')).toBe('Option retenue : « Zod », parce que oui.');
  expect(plainText(paragraph, 'mask')).toBe('Option retenue : « \u{FFFC} », parce que oui.');
});

test('structuralFingerprint ignores formatting but not content', () => {
  const compact = structuralFingerprint(parseMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n* x\n'));
  const aligned = structuralFingerprint(parseMarkdown('| a   | b   |\n| --- | --- |\n| 1   | 2   |\n\n- x\n'));
  const edited = structuralFingerprint(parseMarkdown('| a | b |\n|---|---|\n| 1 | 3 |\n\n- x\n'));
  expect(aligned).toBe(compact);
  expect(edited).not.toBe(compact);
});

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
