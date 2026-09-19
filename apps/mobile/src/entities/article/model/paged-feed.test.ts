import { describe, expect, it } from '@jest/globals';
import { stateOf } from './paged-feed';

describe('stateOf', () => {
  it('fait d’une lecture réussie sans article une étagère vide, et non un chargement', () => {
    expect(stateOf('success')).toBe('empty');
  });

  it('distingue ce qui n’a pas répondu de ce qui a échoué', () => {
    expect(stateOf('pending')).toBe('pending');
    expect(stateOf('error')).toBe('error');
  });
});
