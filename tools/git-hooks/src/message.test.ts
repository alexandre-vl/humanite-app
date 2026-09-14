import { describe, expect, test } from 'vitest';
import { stripspace } from './message.ts';

describe('stripspace', () => {
  test('removes trailing blanks and leading, trailing and repeated blank lines, and ends with a newline', () => {
    expect(stripspace('\n\nfeat: x  \n\n\n\ncorps\t\n\n')).toBe('feat: x\n\ncorps\n');
    expect(stripspace('')).toBe('');
    expect(stripspace('\n \n')).toBe('');
  });

  test('drops comment lines only when asked', () => {
    expect(stripspace('feat: x\n# commentaire\n')).toBe('feat: x\n# commentaire\n');
    expect(stripspace('feat: x\n# commentaire\n\n#\ncorps\n', true)).toBe('feat: x\n\ncorps\n');
  });
});
