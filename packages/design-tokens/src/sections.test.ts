import { expect, test } from 'vitest';
import { contrastRatio } from './contrast.ts';
import { PALETTE } from './palette.ts';
import { SECTION_COLORS, sectionColor } from './sections.ts';

test('every section of the newspaper has one ground, and no two share a code', () => {
  const codes = SECTION_COLORS.map(([code]) => code);
  expect(codes).toHaveLength(8);
  expect(new Set(codes).size).toBe(codes.length);
});

test('a ground carries a white headline at the ratio WCAG asks of body text', () => {
  for (const [code, ground] of SECTION_COLORS) {
    expect({ code, ratio: contrastRatio(PALETTE.white, ground) >= 4.5 }).toEqual({ code, ratio: true });
  }
});

test('a code reads back its own ground', () => {
  expect(sectionColor('mon')).toBe('#17416b');
  expect(sectionColor('spo')).toBe('#116974');
});
