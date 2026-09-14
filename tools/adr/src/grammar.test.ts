import { describe, expect, test } from 'vitest';
import {
  citedCriteria,
  isReevaluation,
  labelledText,
  matchChosenOption,
  matchValence,
  scanKeywords,
} from './grammar.ts';
import { CODE_MASK } from './markdown.ts';

describe('matchValence', () => {
  test.each([
    ['Bien, parce que les types sont inférés.', 'good'],
    ['Neutre, parce que rien ne change.', 'neutral'],
    ['Mauvais, parce qu’aucune locale n’existe.', 'bad'],
    ["Mauvais, parce qu'il faut maintenir l'outil.", 'bad'],
  ] as const)('%s', (text, valence) => {
    expect(matchValence(text)).toBe(valence);
  });

  test.each([
    'Bien parce que la virgule manque.',
    'Bien, parce que ',
    'Positif, parce que tout va bien.',
    'Bien, car ça marche.',
  ])('rejects %s', (text) => {
    expect(matchValence(text)).toBeNull();
  });
});

describe('matchChosenOption', () => {
  test('reads the option name, elided or not', () => {
    expect(matchChosenOption('Option retenue : « Zod », parce que sa locale existe (C1).')).toBe('Zod');
    expect(
      matchChosenOption('Option retenue : « MADR 4 vérifié par tools/adr », parce qu’elle seule vérifie (C1).'),
    ).toBe('MADR 4 vérifié par tools/adr');
  });

  test.each([
    'Option retenue : Zod, parce que sa locale existe.',
    'Option retenue : « Zod ».',
    'Option : « Zod », parce que oui.',
  ])('rejects %s', (text) => {
    expect(matchChosenOption(text)).toBeNull();
  });
});

test('labelledText requires the bold label, the em dash and some text', () => {
  expect(labelledText('C1 — Messages en français.', 'C1')).toBe('Messages en français.');
  expect(labelledText('C1 - Messages en français.', 'C1')).toBeNull();
  expect(labelledText('C1 — ', 'C1')).toBeNull();
  expect(labelledText('C2 — Types.', 'C1')).toBeNull();
});

test('isReevaluation needs text after the label', () => {
  expect(isReevaluation('Réévaluation : Zod cesse de publier sa locale.')).toBe(true);
  expect(isReevaluation('Réévaluation : ')).toBe(false);
  expect(isReevaluation('Réévaluer : plus tard.')).toBe(false);
});

describe('scanKeywords', () => {
  test('classifies each allowed keyword, plural and negative forms included', () => {
    expect(scanKeywords('Un ADR DOIT citer. Les ADR DOIVENT citer.').levels).toEqual(['must', 'must']);
    expect(scanKeywords('Un agent NE DOIT PAS décider ; les agents NE DOIVENT PAS décider.').levels).toEqual([
      'must-not',
      'must-not',
    ]);
    expect(scanKeywords('Un schéma PEUT être partagé ; ils PEUVENT l’être.').levels).toEqual(['may', 'may']);
  });

  test('never counts the PEUT of a forbidden NE PEUT PAS', () => {
    expect(scanKeywords('Un agent NE PEUT PAS décider.')).toEqual({ forbidden: ['NE PEUT PAS'], levels: [] });
  });

  test('ignores lowercase words, keywords inside longer words and masked inline code', () => {
    expect(scanKeywords(`Il doit citer ; DOITS n’est pas un mot-clé ; ${CODE_MASK} est du code.`).levels).toEqual([]);
  });

  test('reports every forbidden modal word', () => {
    expect(scanKeywords('Un test DEVRAIT passer et reste OBLIGATOIRE.').forbidden).toEqual(['DEVRAIT', 'OBLIGATOIRE']);
  });
});

test('citedCriteria reads single and grouped citations', () => {
  expect(citedCriteria('Bien, parce que rapide (C1) et sûr (C2, C3), voire (C4,C5).')).toEqual([1, 2, 3, 4, 5]);
  expect(citedCriteria('Pas de citation ici (C) ni (critère 1).')).toEqual([]);
});
