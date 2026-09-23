import { expect, test } from 'vitest';
import { AUTHORS, SECTIONS } from './index.ts';

/** The journal's first seven, in the order of its own menu, and one the fiction added after them. */
test('the corpus runs eight sections, the journal’s first seven in its order and sport after them', () => {
  expect(SECTIONS.map((section) => section.id)).toEqual([
    'politique',
    'social-eco',
    'societe',
    'monde',
    'culture-et-savoir',
    'feminisme',
    'environnement',
    'sport',
  ]);
});

test('the newsroom holds nineteen authors, three of them columnists', () => {
  expect(AUTHORS).toHaveLength(19);
  expect(AUTHORS.filter((author) => author.isColumnist)).toHaveLength(3);
});
