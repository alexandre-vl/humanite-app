import { describe, expect, it } from '@jest/globals';
import { collapseDistance, collapseProgress, lerp } from './geometry';

describe('collapseDistance', () => {
  it('is the expanded height less the collapsed height', () => {
    expect(collapseDistance(64, 0)).toBe(64);
    expect(collapseDistance(64, 40)).toBe(24);
  });

  it('never goes negative', () => {
    expect(collapseDistance(40, 64)).toBe(0);
  });
});

describe('collapseProgress', () => {
  it('runs from 0 expanded to 1 collapsed', () => {
    expect(collapseProgress(0, 64)).toBe(0);
    expect(collapseProgress(32, 64)).toBe(0.5);
    expect(collapseProgress(64, 64)).toBe(1);
  });

  it('clamps beyond the collapse distance and above the top', () => {
    expect(collapseProgress(200, 64)).toBe(1);
    expect(collapseProgress(-20, 64)).toBe(0);
  });

  it('is collapsed as soon as it scrolls when there is no distance', () => {
    expect(collapseProgress(1, 0)).toBe(1);
    expect(collapseProgress(0, 0)).toBe(0);
  });
});

describe('lerp', () => {
  it('interpolates linearly between the bounds', () => {
    expect(lerp(1, 0, 0)).toBe(1);
    expect(lerp(1, 0, 0.5)).toBe(0.5);
    expect(lerp(0, -64, 1)).toBe(-64);
  });
});
