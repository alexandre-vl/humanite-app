import { expect, test } from 'vitest';
import { compareDiagnostics, diagnostic, formatDiagnostic, renderDiagnostics, START } from './diagnostics.ts';
import { repoPath } from './paths.ts';

const at = repoPath('docs/a.md');

test('formatDiagnostic prints the position, the code and the short commit', () => {
  expect(formatDiagnostic(diagnostic('x/y', at, { line: 3, column: 2 }, 'message', 'abcdef123456'))).toBe(
    'docs/a.md:3:2: x/y: message (commit abcdef1)',
  );
  expect(formatDiagnostic(diagnostic('x/y', at, START, 'message'))).toBe('docs/a.md:1:1: x/y: message');
});

test('diagnostics sort by path, line, column, code, then message', () => {
  const items = [
    diagnostic('b/b', at, START, 'm'),
    diagnostic('a/a', repoPath('docs/b.md'), START, 'm'),
    diagnostic('a/a', at, { line: 2, column: 1 }, 'm'),
    diagnostic('a/a', at, START, 'z'),
    diagnostic('a/a', at, START, 'm'),
  ];
  expect(renderDiagnostics(items, 'text').split('\n')).toEqual([
    'docs/a.md:1:1: a/a: m',
    'docs/a.md:1:1: a/a: z',
    'docs/a.md:1:1: b/b: m',
    'docs/a.md:2:1: a/a: m',
    'docs/b.md:1:1: a/a: m',
  ]);
  expect(items.toSorted(compareDiagnostics)[0]).toEqual(diagnostic('a/a', at, START, 'm'));
  expect(JSON.parse(renderDiagnostics(items, 'json'))).toHaveLength(5);
});
