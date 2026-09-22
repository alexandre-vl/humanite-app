import { describe, expect, it } from '@jest/globals';
import { asDisplayText } from './index';

describe('asDisplayText', () => {
  it('rend le texte qu’elle valide', () => {
    expect(asDisplayText('À la une')).toBe('À la une');
  });

  it('refuse une chaîne où il n’y a rien à lire', () => {
    expect(() => asDisplayText('')).toThrow(/vide/u);
    expect(() => asDisplayText('   ')).toThrow(/vide/u);
  });
});
