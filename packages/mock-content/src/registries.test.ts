import { expect, test } from 'vitest';
import { AUTHORS, SECTIONS } from './index.ts';

test('there are eight sections, ordered from one to eight', () => {
  expect(SECTIONS).toHaveLength(8);
  expect(SECTIONS.map((section) => section.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
});

test('the newsroom holds nineteen authors, three of them columnists', () => {
  expect(AUTHORS).toHaveLength(19);
  expect(AUTHORS.filter((author) => author.isColumnist)).toHaveLength(3);
});
