import { expect, expectTypeOf, test } from 'vitest';
import { defineChecks } from './checks.ts';
import { START } from './diagnostics.ts';
import { repoPath } from './paths.ts';

const checks = defineChecks({
  'demo/missing': { summary: 'le fichier existe', message: 'fichier absent' },
  'demo/stale': { summary: 'le fichier est à jour', message: 'périmé à partir de la ligne {line}' },
});

test('lists the codes in declaration order and types the details of each message', () => {
  expect(checks.codes).toEqual(['demo/missing', 'demo/stale']);
  expectTypeOf(checks.codes).toEqualTypeOf<readonly ('demo/missing' | 'demo/stale')[]>();
  expectTypeOf(checks.finding<'demo/stale'>)
    .parameter(2)
    .toEqualTypeOf<Readonly<Record<'line', string | number | readonly (string | number)[]>>>();
});

test('finding renders the message at the given position and commit', () => {
  expect(checks.finding('demo/stale', repoPath('a.md'), { line: 3 }, { line: 3, column: 1 }, 'abc')).toEqual({
    code: 'demo/stale',
    path: 'a.md',
    line: 3,
    column: 1,
    message: 'périmé à partir de la ligne 3',
    commit: 'abc',
  });
  expect(checks.finding('demo/missing', repoPath('a.md'), {})).toMatchObject({ ...START, commit: null });
});

test('a malformed placeholder fails when the table is defined', () => {
  expect(() => defineChecks({ 'demo/bad': { summary: 's', message: 'fichier {file name}' } })).toThrow(
    'demo/bad : espace réservé invalide {file name}',
  );
});
