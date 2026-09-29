import { describe, expect, it } from '@jest/globals';
import { boundedOffset, boundedScale, scaledOffset } from './zoom';

describe('les limites du zoom', () => {
  it('garde une image entre sa taille entière et quatre fois celle-ci', () => {
    expect(boundedScale(0.2)).toBe(1);
    expect(boundedScale(2.5)).toBe(2.5);
    expect(boundedScale(8)).toBe(4);
  });

  it('centre un axe plus petit que l’écran, même après un déplacement', () => {
    expect(boundedOffset(200, 200, 800, 2)).toBe(0);
    expect(boundedOffset(-200, 200, 800, 2)).toBe(0);
  });

  it('laisse atteindre chaque bord sans jamais dépasser la photographie', () => {
    expect(boundedOffset(700, 400, 400, 3)).toBe(400);
    expect(boundedOffset(-700, 400, 400, 3)).toBe(-400);
    expect(boundedOffset(125, 400, 400, 3)).toBe(125);
    expect(boundedOffset(125, 400, 400, 1)).toBe(0);
  });

  it('agrandit autour du point touché et peut revenir au même cadrage', () => {
    const moved = scaledOffset(20, 100, 1, 3);
    expect(moved).toBe(-140);
    expect(scaledOffset(moved, 100, 3, 1)).toBe(20);
  });
});
