import { describe, expect, it } from '@jest/globals';
import { collapseProgress, lerp } from './geometry';

describe('collapseProgress', () => {
  it('va de 0 dépliée à 1 repliée', () => {
    expect(collapseProgress(0, 64)).toBe(0);
    expect(collapseProgress(32, 64)).toBe(0.5);
    expect(collapseProgress(64, 64)).toBe(1);
  });

  it('se borne au-delà de la course de repli et au-dessus du haut', () => {
    expect(collapseProgress(200, 64)).toBe(1);
    expect(collapseProgress(-20, 64)).toBe(0);
  });

  it('est repliée dès qu’elle défile quand la course est nulle', () => {
    expect(collapseProgress(1, 0)).toBe(1);
    expect(collapseProgress(0, 0)).toBe(0);
  });
});

describe('lerp', () => {
  it('interpole en ligne droite entre les bornes', () => {
    expect(lerp(1, 0, 0)).toBe(1);
    expect(lerp(1, 0, 0.5)).toBe(0.5);
    expect(lerp(0, -64, 1)).toBe(-64);
  });
});
