import { describe, expect, test } from 'vitest';
import { FORMAT_1 } from '../spec/formats/v1.ts';
import { grammarOf } from './grammar.ts';
import { CODE_MASK } from './markdown.ts';

const grammar = grammarOf(FORMAT_1);

describe('matchValence', () => {
  test.each([
    ['Bien, parce que les types sont inférés.', 'good'],
    ['Neutre, parce que rien ne change.', 'neutral'],
    ['Mauvais, parce qu’aucune locale n’existe.', 'bad'],
  ] as const)('%s', (text, valence) => {
    expect(grammar.matchValence(text)).toBe(valence);
  });

  test.each([
    'Bien parce que la virgule manque.',
    'Bien, parce que ',
    'Positif, parce que tout va bien.',
    'Bien, car ça marche.',
    "Mauvais, parce qu'il faut l'apostrophe typographique.",
  ])('rejects %s', (text) => {
    expect(grammar.matchValence(text)).toBeNull();
  });
});

describe('matchChosenOption', () => {
  test('reads the option name', () => {
    expect(grammar.matchChosenOption('Option retenue : « Zod », parce que sa locale existe (C1).')).toBe('Zod');
    expect(grammar.matchChosenOption('Option retenue : « MADR 4 vérifié », parce qu’elle seule vérifie (C1).')).toBe(
      'MADR 4 vérifié',
    );
  });

  test.each([
    'Option retenue : Zod, parce que sa locale existe.',
    'Option retenue : « Zod ».',
    'Option : « Zod », parce que oui.',
  ])('rejects %s', (text) => {
    expect(grammar.matchChosenOption(text)).toBeNull();
  });
});

test('labelledText requires the label, the em dash and some text', () => {
  expect(grammar.labelledText('C1 — Messages en français.', 'C1')).toBe('Messages en français.');
  expect(grammar.labelledText('C1 - Messages en français.', 'C1')).toBeNull();
  expect(grammar.labelledText('C1 — ', 'C1')).toBeNull();
  expect(grammar.labelledText('C2 — Types.', 'C1')).toBeNull();
});

test('isReevaluation needs text after the label', () => {
  expect(grammar.isReevaluation('Réévaluation : Zod cesse de publier sa locale.')).toBe(true);
  expect(grammar.isReevaluation('Réévaluation : ')).toBe(false);
  expect(grammar.isReevaluation('Réévaluer : plus tard.')).toBe(false);
});

describe('scanKeywords', () => {
  const levels = (text: string): readonly string[] => grammar.scanKeywords(text).levels.map((match) => match.value);
  const forbidden = (text: string): readonly string[] =>
    grammar.scanKeywords(text).forbidden.map((match) => match.text);
  const negations = (text: string): readonly string[] =>
    grammar.scanKeywords(text).negations.map((match) => `${match.text} → ${match.value}`);

  test('classifies each allowed keyword, plural and negative forms included', () => {
    expect(levels('Un ADR DOIT citer. Les ADR DOIVENT citer.')).toEqual(['must', 'must']);
    expect(levels('Un agent NE DOIT PAS décider ; les agents NE DOIVENT PAS décider.')).toEqual(['mustNot', 'mustNot']);
    expect(levels('Un schéma PEUT être partagé ; ils PEUVENT l’être.')).toEqual(['may', 'may']);
  });

  test('never counts the PEUT of a forbidden NE PEUT PAS', () => {
    expect(forbidden('Un agent NE PEUT PAS décider.')).toEqual(['NE PEUT PAS']);
    expect(levels('Un agent NE PEUT PAS décider.')).toEqual([]);
  });

  test('reports forbidden modal words, with or without accents, in French or English', () => {
    expect(forbidden('Un test DEVRAIT passer, OBLIGATOIRE et RECOMMANDÉ, voire RECOMMANDE ; it MUST pass.')).toEqual([
      'DEVRAIT',
      'OBLIGATOIRE',
      'RECOMMANDÉ',
      'RECOMMANDE',
      'MUST',
    ]);
  });

  test('reports negations that mix case or miss a word, with the expected spelling', () => {
    expect(negations('Un agent ne DOIT pas décider.')).toEqual(['ne DOIT pas → NE DOIT PAS']);
    expect(negations('Un agent NE DOIT JAMAIS décider.')).toEqual(['NE DOIT → NE DOIT PAS']);
    expect(negations('Les agents DOIVENT pas décider.')).toEqual(['DOIVENT pas → NE DOIVENT PAS']);
    expect(levels('Un agent ne DOIT pas décider.')).toEqual([]);
  });

  test('ignores lowercase words, keywords glued to letters or hyphens, and masked inline code', () => {
    expect(levels(`Il doit citer ; DOITS, PEUT-ÊTRE et ${CODE_MASK} ne comptent pas.`)).toEqual([]);
  });
});

describe('scanCitations', () => {
  test('reads single and grouped citations', () => {
    expect(grammar.scanCitations('rapide (C1) et sûr (C2, C3).').numbers).toEqual([1, 2, 3]);
  });

  test('reports malformed citations and keeps strict ones', () => {
    const scan = grammar.scanCitations('voir (C01), (C1,C2), (C 3) et (C4).');
    expect(scan.numbers).toEqual([4]);
    expect(scan.malformed.map((match) => match.text)).toEqual(['(C01)', '(C1,C2)', '(C 3)']);
  });

  test('ignores parentheses that are not citations', () => {
    expect(grammar.scanCitations('(C) ni (critère 1) ni (Cn)')).toEqual({ numbers: [], malformed: [] });
  });
});

test('scanMentions keeps four digits, reports other widths, ignores glued prefixes', () => {
  const scan = grammar.scanMentions('ADR-0001, ADR-00001, XADR-0002 et (ADR-0003).');
  expect(scan.valid.map((match) => match.value)).toEqual(['0001', '0003']);
  expect(scan.malformed.map((match) => match.text)).toEqual(['ADR-00001']);
});
