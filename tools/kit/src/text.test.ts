import { expect, test } from 'vitest';
import { compareText, decodeUtf8, firstDifferentLine } from './text.ts';

test('compareText orders by UTF-16 code unit', () => {
  expect(['é', 'b', 'a', 'Z'].toSorted(compareText)).toEqual(['Z', 'a', 'b', 'é']);
});

test('firstDifferentLine points at the first changed, missing or extra line', () => {
  expect(firstDifferentLine('a\nb\nc', 'a\nx\nc')).toBe(2);
  expect(firstDifferentLine('a\nb', 'a\nb\nc')).toBe(3);
  expect(firstDifferentLine('a\nb\nc', 'a\nb')).toBe(3);
});

test('decodeUtf8 refuses invalid bytes and keeps a byte order mark', () => {
  expect(decodeUtf8(new Uint8Array([0xc3, 0x28]))).toBeNull();
  expect(decodeUtf8(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe('\u{FEFF}a');
});
