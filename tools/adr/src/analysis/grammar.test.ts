import { describe, expect, test } from 'vitest';
import { FORMAT_1 } from '../spec/formats/v1.ts';
import { grammarOf } from './grammar.ts';
import { CODE_MASK } from './mask.ts';

const grammar = grammarOf(FORMAT_1);

describe('sentences', () => {
  test('each built sentence is read back by its matcher', () => {
    expect(grammar.matchValence(grammar.argumentLine('bad', grammar.because('aucune locale', true)))).toBe('bad');
    expect(grammar.matchChosenOption(grammar.chosenOptionLine('MADR 4', grammar.because('il vérifie (C1).')))).toBe(
      'MADR 4',
    );
    expect(grammar.isReevaluation(grammar.reevaluationLine('Zod cesse de publier.'))).toBe(true);
    expect(grammar.labelledLine(grammar.ruleLabel(2), 'Texte.')).toBe('**R2** — Texte.');
    expect(grammar.citation([1, 3])).toBe('(C1, C3)');
    expect(grammar.chosenOptionTemplate).toBe('Option retenue : « option », parce que … (C1)');
  });
});

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

  test('reports forbidden modal words, with or without accents or a hyphen, in French or English', () => {
    expect(
      forbidden(
        'Un test DEVRAIT passer, OBLIGATOIRE et RECOMMANDÉ, voire RECOMMANDE ; FAUT-IL, DEVRA-T-ON ; it MUST pass.',
      ),
    ).toEqual(['DEVRAIT', 'OBLIGATOIRE', 'RECOMMANDÉ', 'RECOMMANDE', 'FAUT', 'DEVRA', 'MUST']);
  });

  test('reports every negation of a keyword that is not an exact negative form, with the spelling to write', () => {
    expect(negations('Un agent ne DOIT pas décider.')).toEqual(['ne DOIT pas → NE DOIT PAS']);
    expect(negations('Un agent NE DOIT JAMAIS décider.')).toEqual(['NE DOIT JAMAIS → NE DOIT PAS']);
    expect(negations('Les agents DOIVENT pas décider.')).toEqual(['DOIVENT pas → NE DOIVENT PAS']);
    expect(negations('Un agent ne PEUT pas décider.')).toEqual(['ne PEUT pas → NE DOIT PAS']);
    expect(negations('Un agent Ne PEUT jamais décider.')).toEqual(['Ne PEUT jamais → NE DOIT PAS']);
    expect(negations('Les agents PEUVENT plus décider.')).toEqual(['PEUVENT plus → NE DOIVENT PAS']);
    expect(negations('Un agent N’DOIT rien.')).toEqual(['N’DOIT rien → NE DOIT PAS']);
    expect(levels('Un agent ne PEUT pas décider.')).toEqual([]);
  });

  test('keeps affirmative keywords next to ordinary words', () => {
    expect(negations('Un agent DOIT, pas seulement, citer.')).toEqual([]);
    expect(levels('Le schéma PEUT pousser plus loin.')).toEqual(['may']);
  });

  test('ignores lowercase words, keywords glued to letters or hyphens, and masked inline code', () => {
    expect(levels(`Il doit citer ; DOITS, PEUT-ÊTRE et ${CODE_MASK} ne comptent pas.`)).toEqual([]);
  });
});

describe('scanCitations', () => {
  test('reads single and grouped citations with their positions', () => {
    const scan = grammar.scanCitations('rapide (C1) et sûr (C2, C3).');
    expect(scan.numbers).toEqual([1, 2, 3]);
    expect(scan.citations.map((citation) => citation.index)).toEqual([7, 19]);
  });

  test('reports malformed citations and keeps strict ones', () => {
    const scan = grammar.scanCitations('voir (C01), (C1,C2), (C 3) et (C4).');
    expect(scan.numbers).toEqual([4]);
    expect(scan.malformed.map((match) => match.text)).toEqual(['(C01)', '(C1,C2)', '(C 3)']);
  });

  test('ignores parentheses that are not citations', () => {
    expect(grammar.scanCitations('(C) ni (critère 1) ni (Cn)')).toEqual({ citations: [], numbers: [], malformed: [] });
  });
});

test('scanMentions keeps four digits, reports other widths, ignores glued prefixes', () => {
  const scan = grammar.scanMentions('ADR-0001, ADR-00001, XADR-0002 et (ADR-0003).');
  expect(scan.valid.map((match) => match.value)).toEqual(['0001', '0003']);
  expect(scan.malformed.map((match) => match.text)).toEqual(['ADR-00001']);
});
