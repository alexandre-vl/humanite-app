import { describe, expect, it } from '@jest/globals';
import { onceEach } from './index';

const itself = (item: string): string => item;

describe('onceEach', () => {
  it('garde chaque élément une fois, là où il vient d’abord', () => {
    expect(onceEach(['un', 'deux', 'un', 'trois', 'deux'], itself)).toEqual(['un', 'deux', 'trois']);
  });

  it('reconnaît un élément à sa clé, et non à ce qu’il porte', () => {
    const first = { id: 'a', title: 'La une de ce matin' };
    const again = { id: 'a', title: 'La une de ce soir' };
    expect(onceEach([first, again], (item) => item.id)).toEqual([first]);
  });

  /** Whatever holds on to the run it was handed — a list, a memo — keeps holding on to it while nothing repeats. */
  it('rend la suite telle qu’elle est venue quand rien n’y revient', () => {
    const run = ['un', 'deux', 'trois'];
    expect(onceEach(run, itself)).toBe(run);
  });
});
