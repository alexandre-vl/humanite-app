import { describe, expect, it } from '@jest/globals';
import { asDisplayText } from './index';

describe('asDisplayText', () => {
  it('hands back the text it sanctions', () => {
    expect(asDisplayText('À la une')).toBe('À la une');
  });

  it('refuses a string with nothing to read', () => {
    expect(() => asDisplayText('')).toThrow(/vide/u);
    expect(() => asDisplayText('   ')).toThrow(/vide/u);
  });
});
