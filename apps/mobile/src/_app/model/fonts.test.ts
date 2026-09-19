import { describe, expect, it } from '@jest/globals';
import { FONT_FAMILIES } from '@huma/design-tokens';
import { FONTS } from './fonts';

/**
 * Every family the tokens name, read off the table rather than listed again here: a face added to the tokens and not
 * to the startup registry renders as the system font, silently, and a hand-written list would not notice.
 */
const families = Object.values(FONT_FAMILIES).flatMap((entry): readonly string[] =>
  typeof entry === 'string' ? [entry] : Object.values(entry),
);

describe('FONTS', () => {
  it('enregistre chaque famille que les tokens référencent', () => {
    expect([...Object.keys(FONTS)].sort()).toEqual([...families].sort());
  });
});
