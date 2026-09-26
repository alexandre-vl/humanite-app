import { expect, test } from 'vitest';
import { compareText, decodeUtf8, firstDifferentLine, trimEndOf } from './text.ts';

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

test('trimEndOf drops the run of the given characters that ends the text, and only that one', () => {
  expect(trimEndOf('a \t\r\n \t', ' \t')).toBe('a \t\r\n');
  expect(trimEndOf('\n\na\n\n', '\n')).toBe('\n\na');
  expect(trimEndOf(' \t ', ' \t')).toBe('');
  expect(trimEndOf('a\u00A0', ' ')).toBe('a\u00A0');
});

test('trimEndOf stays linear on long runs, where /[ \\t]+$/ would take minutes', () => {
  const run = '\t'.repeat(200_000);
  const started = performance.now();
  expect(trimEndOf(`${run}x`, ' \t')).toBe(`${run}x`);
  expect(trimEndOf(`x${run}`, ' \t')).toBe('x');
  expect(performance.now() - started).toBeLessThan(1_000);
});
