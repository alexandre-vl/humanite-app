import { describe, expect, it } from '@jest/globals';
import { cutsAWord } from './word-cut';

const lines = (...texts: readonly string[]): readonly Readonly<{ text: string }>[] => texts.map((text) => ({ text }));

describe('cutsAWord', () => {
  it('voit le mot coupé là où la place a manqué', () => {
    expect(cutsAWord(lines('Syst', 'ème'))).toBe(true);
    expect(cutsAWord(lines('Très ', 'gra', 'nd'))).toBe(true);
  });

  it('laisse passer une ligne brisée entre deux mots, ou après un trait d’union', () => {
    expect(cutsAWord(lines('Très ', 'grand'))).toBe(false);
    expect(cutsAWord(lines('Social-', 'Éco'))).toBe(false);
    expect(cutsAWord(lines('Système'))).toBe(false);
    expect(cutsAWord(lines())).toBe(false);
  });
});
