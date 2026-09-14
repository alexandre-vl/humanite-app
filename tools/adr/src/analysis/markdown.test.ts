import { expect, test } from 'vitest';
import { countWords, parseMarkdown, plainText, structuralFingerprint, textSpan } from './markdown.ts';

test('countWords counts text and inline code, not code blocks nor front matter', () => {
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

test('plainText collapses non-breaking spaces and masks inline code on request', () => {
  const [paragraph] = parseMarkdown('Option retenue\u{A0}: «\u{202F}`Zod` », parce que\n**oui**.').children;
  expect(paragraph).toBeDefined();
  if (paragraph !== undefined) {
    expect(plainText(paragraph, 'keep')).toBe('Option retenue : « Zod », parce que oui.');
    expect(plainText(paragraph, 'mask')).toBe('Option retenue : « \u{FFFC} », parce que oui.');
  }
});

test('textSpan locates a character on its own line and column', () => {
  const [, paragraph] = parseMarkdown('# Titre\n\nPremière ligne\nun mot DEVRAIT ici.').children;
  expect(paragraph).toBeDefined();
  if (paragraph !== undefined) {
    const span = textSpan(paragraph, 'mask');
    expect(span.locate(span.text.indexOf('DEVRAIT'))).toEqual({ line: 4, column: 8 });
  }
});

test('structuralFingerprint ignores formatting but not content', () => {
  const compact = structuralFingerprint(parseMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n* x\n'));
  const aligned = structuralFingerprint(parseMarkdown('| a   | b   |\n| --- | --- |\n| 1   | 2   |\n\n- x\n'));
  const edited = structuralFingerprint(parseMarkdown('| a | b |\n|---|---|\n| 1 | 3 |\n\n- x\n'));
  expect(aligned).toBe(compact);
  expect(edited).not.toBe(compact);
});
