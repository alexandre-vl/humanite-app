import { describe, expect, it } from '@jest/globals';
import { FR } from './fr';

describe('FR', () => {
  it('tient ses familles de clés groupées, dans l’ordre alphabétique', () => {
    // Groups that run in alphabetical order and hold together are exactly a sorted list of first segments: a key
    // slipped into the wrong family breaks one or the other, and a dictionary read by hand needs both.
    const families = Object.keys(FR).map((key) => key.split('.')[0] ?? '');
    expect(families).toEqual([...families].sort((left, right) => left.localeCompare(right)));
  });

  it('ne laisse aucun texte vide, qu’aucune marque ne vaudrait', () => {
    expect(Object.values(FR).filter((text) => text.trim() === '')).toEqual([]);
  });
});
