import { describe, expect, test } from 'vitest';
import type { FileEdit } from './edit.ts';
import { contentAfterEdit, contentAfterMultiEdit } from './edit.ts';

const edit = (oldString: string, newString: string, replaceAll = false): FileEdit => ({
  oldString,
  newString,
  replaceAll,
});

describe('contentAfterEdit', () => {
  test('replaces the text as written, once, or everywhere with replace_all', () => {
    expect(contentAfterEdit('a b a', edit('b', 'c'))).toBe('a c a');
    expect(contentAfterEdit('a b a', edit('a', 'c'))).toBeNull();
    expect(contentAfterEdit('a b a', edit('a', 'c', true))).toBe('c b c');
    expect(contentAfterEdit('a $& a', edit('$&', '$1'))).toBe('a $1 a');
  });

  test('fails when the text is absent or the edit changes nothing', () => {
    expect(contentAfterEdit('abc', edit('x', 'y'))).toBeNull();
    expect(contentAfterEdit('abc', edit('b', 'b'))).toBeNull();
  });

  test('creates a missing or blank file from an empty old_string, and refuses it on a file with content', () => {
    expect(contentAfterEdit(null, edit('', 'nouveau'))).toBe('nouveau');
    expect(contentAfterEdit('  \n', edit('', 'nouveau'))).toBe('nouveau');
    expect(contentAfterEdit('texte', edit('', 'nouveau'))).toBeNull();
    expect(contentAfterEdit(null, edit('a', 'b'))).toBeNull();
  });

  test('reads CRLF files as LF', () => {
    expect(
      contentAfterEdit('format: 1\r\nstatus: proposed\r\n', edit('1\nstatus: proposed', '1\nstatus: accepted')),
    ).toBe('format: 1\nstatus: accepted\n');
  });

  test('finds straight quotes where the file has curly ones, and curls the new text the same way', () => {
    expect(contentAfterEdit('L’outil “valide”.', edit(`L'outil "valide".`, `L'outil "vérifie" 'ça'.`))).toBe(
      'L’outil “vérifie” ‘ça’.',
    );
  });

  test('swaps unicode escapes both ways and keeps the style of the file', () => {
    const escaped = (hex: string): string => `\\u${hex}`;
    expect(contentAfterEdit('titre é', edit(`titre ${escaped('00e9')}`, `titre ${escaped('00e8')}`))).toBe('titre è');
    expect(contentAfterEdit(`titre ${escaped('00E9')}`, edit('titre é', 'titre è'))).toBe(`titre ${escaped('00E8')}`);
  });

  test('takes the newline after a deleted line', () => {
    expect(contentAfterEdit('a\nb\nc\n', edit('b', ''))).toBe('a\nc\n');
  });
});

describe('contentAfterMultiEdit', () => {
  test('applies edits in order and fails as a whole', () => {
    expect(contentAfterMultiEdit('a b c', [edit('a', 'x'), edit('c', 'z')])).toBe('x b z');
    expect(contentAfterMultiEdit('a b c', [edit('a', 'x'), edit('absent', 'z')])).toBeNull();
  });

  test('refuses an edit of text an earlier edit wrote', () => {
    expect(contentAfterMultiEdit('a b', [edit('a', 'status: accepted'), edit('accepted', 'proposed')])).toBeNull();
  });
});
