import { expect, test } from 'vitest';
import { atWidth, judgePicture, PICTURE } from './index.ts';
import { RECORDED } from './recorded.ts';

/**
 * The judging answers whether a way of asking for a picture holds the rule; these answer whether the pictures the
 * journal actually serves are ones this contract reads, and how the one way this module offers treats each shape of
 * address it can meet. One holds a rule, the others hold a measurement and a branch.
 */

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every picture address the capture kept, at whatever depth of whatever answer holds it. */
const imagesOf = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => imagesOf(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  const own = typeof value['image'] === 'string' && value['image'] !== '' ? [value['image']] : [];
  return [...own, ...Object.values(value).flatMap((child: unknown) => imagesOf(child))];
};

const IMAGES = imagesOf(RECORDED);

test('the way this module asks for a picture holds the rule', () => {
  expect(judgePicture(atWidth)).toEqual([]);
});

test('the capture in the repository holds pictures to read', () => {
  expect(IMAGES.length).toBeGreaterThan(10);
});

test('every picture the journal served is one this contract reads as the journal’s', () => {
  expect(IMAGES.filter((url) => !PICTURE.safeParse({ kind: 'journal', url }).success)).toEqual([]);
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
