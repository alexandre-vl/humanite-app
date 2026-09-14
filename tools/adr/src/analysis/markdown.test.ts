import type { RootContent } from 'mdast';
import { describe, expect, test } from 'vitest';
import { countWords, indexSource, parseMarkdown, plainText, structuralFingerprint, textSpan } from './markdown.ts';

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

describe('textSpan', () => {
  const locateIn = (markdown: string, word: string, code: 'keep' | 'mask' = 'keep') => {
    const source = indexSource(markdown);
    const node = parseMarkdown(markdown).children.at(-1);
    if (node === undefined) {
      throw new Error('aucun bloc');
    }
    const span = textSpan(node, code, source);
    return span.locate(span.text.indexOf(word));
  };

  test('locates a character on its own line and column', () => {
    expect(locateIn('# Titre\n\nPremière ligne\nun mot DEVRAIT ici.', 'DEVRAIT', 'mask')).toEqual({
      line: 4,
      column: 8,
    });
  });

  test('follows escapes, entities and the indentation of continuation lines back to the source', () => {
    expect(locateIn('Un \\* puis DEVRAIT.', 'DEVRAIT')).toEqual({ line: 1, column: 12 });
    expect(locateIn('Un &amp; puis DEVRAIT.', 'DEVRAIT')).toEqual({ line: 1, column: 15 });
    expect(locateIn('- Premier\n  second DEVRAIT.', 'DEVRAIT')).toEqual({ line: 2, column: 10 });
    expect(locateIn('Voir `garde (C1)` ici.', 'garde')).toEqual({ line: 1, column: 7 });
  });
});

describe('structuralFingerprint', () => {
  const bodyOf = (markdown: string): readonly RootContent[] => parseMarkdown(markdown).children;
  const same = (left: string, right: string): boolean =>
    structuralFingerprint(bodyOf(left)) === structuralFingerprint(bodyOf(right));

  test('ignores formatting: bullets, table padding, list tightness and whitespace runs in prose', () => {
    expect(
      same('| a | b |\n|---|---|\n| 1 | 2 |\n\n* x\n', '| a   | b   |\n| --- | --- |\n| 1   | 2   |\n\n- x\n'),
    ).toBe(true);
    expect(same('- x\n- y\n', '- x\n\n- y\n')).toBe(true);
    expect(same('Un  texte\nsur deux lignes.\n', 'Un texte sur deux lignes.\n')).toBe(true);
  });

  test('sees every change of content, in prose, code and links', () => {
    expect(same('Un texte.\n', 'Un autre texte.\n')).toBe(false);
    expect(same('Un texte.\n', 'Untexte.\n')).toBe(false);
    expect(same('```yaml\na:\n  b: 1\n```\n', '```yaml\na:\n b: 1\n```\n')).toBe(false);
    expect(same('Voir `a  b`.\n', 'Voir `a b`.\n')).toBe(false);
    expect(same('[zod](https://zod.dev)\n', '[zod](https://zod.dev/v4)\n')).toBe(false);
    expect(same('- x\n- y\n', '- y\n- x\n')).toBe(false);
  });
});
