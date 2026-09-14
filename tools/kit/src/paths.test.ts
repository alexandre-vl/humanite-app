import { expect, test } from 'vitest';
import { isRepoPath, toRepoPath } from './paths.ts';

test.each(['a', 'docs/adr/0000-x.md', 'café/é.md', '..name'])('%s is a repository path', (value) => {
  expect(isRepoPath(value)).toBe(true);
});

test.each(['', '/abs', 'a//b', './a', 'a/../b', 'a\\b', 'a/'])('%j is not a repository path', (value) => {
  expect(isRepoPath(value)).toBe(false);
});

test('toRepoPath keeps paths strictly inside the root', () => {
  expect(toRepoPath('/repo', '/repo/docs/a.md')).toBe('docs/a.md');
  expect(toRepoPath('/repo', '/repo/..name/a.md')).toBe('..name/a.md');
  expect(toRepoPath('/repo', '/repo')).toBeNull();
  expect(toRepoPath('/repo', '/other/a.md')).toBeNull();
});
