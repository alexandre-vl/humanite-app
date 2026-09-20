import { describe, expect, it } from '@jest/globals';
import { FONT_FAMILIES } from '@huma/design-tokens';
import { FONTS } from './fonts';

/**
 * Every family the tokens name, read off the table rather than listed again here: a face added to the tokens and not
 * to the startup registry renders as the system font, silently, and a hand-written list would not notice. A set with
 * fewer files than the paper has faces names one of them twice, so they are counted once.
 */
const families = [...new Set(Object.values(FONT_FAMILIES).flatMap((set): readonly string[] => Object.values(set)))];

describe('FONTS', () => {
  it('enregistre chaque famille que les tokens référencent', () => {
    expect([...Object.keys(FONTS)].sort()).toEqual([...families].sort());
  });
});
