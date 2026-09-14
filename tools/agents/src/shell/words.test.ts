import { describe, expect, test } from 'vitest';
import type { Piece } from './words.ts';
import {
  globSource,
  hasKnownText,
  isKnown,
  isPattern,
  literalWord,
  makeWord,
  pathSegments,
  wordSource,
} from './words.ts';

const text = (value: string, pattern = true): Piece => ({ kind: 'text', text: value, pattern });

const unknown = (source: string): Piece => ({ kind: 'unknown', source });

describe('makeWord', () => {
  test('merges adjacent text of the same kind and drops empty text', () => {
    const word = makeWord([text('a'), text('b'), text('', false), text('c', false), unknown('$x')]);
    expect(word).toEqual({ text: 'abc$x', pieces: [text('ab'), text('c', false), unknown('$x')] });
  });
});

describe('word predicates', () => {
  test('tell known, pattern and partly known words apart', () => {
    expect(isKnown(literalWord('a*'))).toBe(true);
    expect(isPattern(literalWord('a*'))).toBe(false);
    expect(isPattern(makeWord([text('a*')]))).toBe(true);
    expect(isKnown(makeWord([unknown('$x'), text('/a')]))).toBe(false);
    expect(hasKnownText(makeWord([unknown('$x')]))).toBe(false);
    expect(hasKnownText(makeWord([unknown('$x'), text('/a')]))).toBe(true);
  });
});

describe('wordSource', () => {
  const matches = (pieces: readonly Piece[], candidate: string): boolean =>
    new RegExp(`^${wordSource(makeWord(pieces))}$`, 'u').test(candidate);

  test('matches pathname patterns within one segment, quoted text literally', () => {
    expect(matches([text('docs/*.md')], 'docs/a.md')).toBe(true);
    expect(matches([text('docs/*.md')], 'docs/x/a.md')).toBe(false);
    expect(matches([text('?[0-9][!a-z]')], 'x1B')).toBe(true);
    expect(matches([text('[[:digit:]]*')], '7x')).toBe(true);
    expect(matches([text('*.md', false)], 'a.md')).toBe(false);
    expect(matches([text('[unclosed')], '[unclosed')).toBe(true);
  });

  test('lets an unknown piece stand for anything, slashes included', () => {
    expect(matches([unknown('$root'), text('/.git/hooks/pre-commit', false)], '/home/a/.git/hooks/pre-commit')).toBe(
      true,
    );
  });

  test('reads a quoted word as a pattern when the command matches it itself', () => {
    expect(new RegExp(`^${globSource(literalWord('*.md'))}$`, 'u').test('a.md')).toBe(true);
  });
});

describe('pathSegments', () => {
  test('splits a known word on slashes, keeping pattern flags', () => {
    expect(pathSegments(makeWord([text('/a/', false), text('*.md')]))?.map((segment) => segment.text)).toEqual([
      '',
      'a',
      '*.md',
    ]);
    expect(pathSegments(makeWord([unknown('$x'), text('/a')]))).toBeNull();
  });
});
