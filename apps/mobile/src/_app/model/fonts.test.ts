import { describe, expect, it } from '@jest/globals';
import { FONT_FAMILIES } from '@huma/design-tokens';
import { FONTS } from './fonts';

describe('FONTS', () => {
  it('enregistre chaque famille que les tokens référencent', () => {
    const registered = Object.keys(FONTS);
    const families = [
      FONT_FAMILIES.body.light,
      FONT_FAMILIES.body.regular,
      FONT_FAMILIES.body.bold,
      FONT_FAMILIES.display,
    ];
    for (const family of families) {
      expect(registered).toContain(family);
    }
  });
});
