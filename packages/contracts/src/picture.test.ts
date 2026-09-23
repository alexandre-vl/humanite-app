import { expect, test } from 'vitest';
import { atSquare, atWidth, judgePicture, PICTURE } from './index.ts';

/**
 * The judging answers whether a way of asking for a picture holds the rule; these answer how the one way this module
 * offers treats each shape of address it can meet. Whether the pictures the journal actually serves are ones this
 * contract reads is measured beside the client, in the package that keeps its answers.
 */

test('the way this module asks for a picture holds the rule', () => {
  expect(judgePicture(atWidth)).toEqual([]);
});

test('a picture of the journal is refused when it points anywhere but the journal’s own pictures', () => {
  expect(PICTURE.safeParse({ kind: 'journal', url: 'https://i0.wp.com/www.humanite.fr/x.jpg' }).success).toBe(false);
  expect(PICTURE.safeParse({ kind: 'journal', url: 'https://www.humanite.fr/wp-admin/x.jpg' }).success).toBe(false);
  expect(PICTURE.safeParse({ kind: 'journal', url: 'http://www.humanite.fr/wp-content/uploads/x.jpg' }).success).toBe(
    false,
  );
});

test('a picture of the corpus is a key of the corpus, and nothing else', () => {
  expect(PICTURE.safeParse({ kind: 'corpus', key: 'pol-a1-hero' }).success).toBe(true);
  expect(PICTURE.safeParse({ kind: 'corpus', key: 'https://www.humanite.fr/wp-content/uploads/x.jpg' }).success).toBe(
    false,
  );
});

test('an address that asks for no width is given one, after whatever it already asks', () => {
  const base = 'https://www.humanite.fr/wp-content/uploads/2026/09/x.jpg';
  expect(atWidth(base, 320)).toBe(`${base}?w=320`);
  expect(atWidth(`${base}?resize=1200,444`, 320)).toBe(`${base}?resize=1200,444&w=320`);
});

test('a width written after another parameter is the one replaced, and the other stays', () => {
  const base = 'https://www.humanite.fr/wp-content/uploads/2026/09/x.jpg';
  expect(atWidth(`${base}?h=150&w=150&crop=1`, 1080)).toBe(`${base}?h=150&w=1080&crop=1`);
});

/** A square place is cut square by the journal's server: its width and height set, the crop asked, the rest kept. */
test('a picture of the journal is asked for cut square, whatever size and crop its address asked before', () => {
  const uploads = 'https://www.humanite.fr/wp-content/uploads/2026/09/';
  expect(atSquare(`${uploads}une.jpg?w=1200`, 320)).toBe(`${uploads}une.jpg?w=320&h=320&crop=1`);
  expect(atSquare(`${uploads}une.jpg?w=150&h=150&crop=1`, 320)).toBe(`${uploads}une.jpg?w=320&h=320&crop=1`);
  expect(atSquare(`${uploads}une.jpg`, 96)).toBe(`${uploads}une.jpg?w=96&h=96&crop=1`);
});
