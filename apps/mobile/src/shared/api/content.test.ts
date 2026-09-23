import { describe, expect, it } from '@jest/globals';
import { agreed } from './content';
import { SOURCE } from './source';

describe('agreed', () => {
  /**
   * The variable is read for what keeps its data under the source's name; the bundle was resolved for one source. A
   * build where the two differ would keep one source's answers under the other's name.
   */
  it('refuse une build dont la variable nomme une autre source que celle qu’elle lit', () => {
    expect(() => agreed(SOURCE, 'service')).toThrow(/relancer Metro/u);
  });

  it('rend la source que la build lit quand la variable la nomme', () => {
    expect(agreed(SOURCE, 'mock')).toBe(SOURCE);
  });
});
