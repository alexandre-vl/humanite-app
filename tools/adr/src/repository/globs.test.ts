import { expect, test } from 'vitest';
import { compileGlob } from './globs.ts';

const matches = (glob: string, path: string): boolean => compileGlob(glob)?.test(path) ?? false;

test('** spans any depth, * and ? stay inside a segment', () => {
  expect(matches('docs/adr/**', 'docs/adr/0000-x.md')).toBe(true);
  expect(matches('docs/adr/**', 'docs/adr/a/b.md')).toBe(true);
  expect(matches('docs/adr/**', 'docs/adrx/a.md')).toBe(false);
  expect(matches('tools/**/src/*.ts', 'tools/src/a.ts')).toBe(true);
  expect(matches('tools/**/src/*.ts', 'tools/adr/deep/src/a.ts')).toBe(true);
  expect(matches('tools/*.ts', 'tools/a/b.ts')).toBe(false);
  expect(matches('docs/?.md', 'docs/a.md')).toBe(true);
  expect(matches('.claude/settings.json', '.claude/settings.json')).toBe(true);
  expect(matches('.claude/settings.json', 'xclaude/settings.json')).toBe(false);
});

test.each(['', './docs/**', 'docs/../x', 'docs/', '/abs', 'docs/{a,b}', 'docs/[ab]', '!docs', 'docs/a**b', 'a b'])(
  '%j is outside the glob subset',
  (glob) => {
    expect(compileGlob(glob)).toBeNull();
  },
);
