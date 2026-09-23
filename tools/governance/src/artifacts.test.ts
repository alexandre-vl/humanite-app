import { expect, test } from 'vitest';
import { catalogueGaps, shapesTheCache } from './artifacts.ts';

/**
 * The persisted cache is thrown away whenever its buster moves, and the buster is a hash of what it reads. What it
 * reads is therefore what may cost every reader a day of reading, and it is pinned here by name.
 */
test('the cache buster reads the contracts that shape what the app caches', () => {
  expect(['article.ts', 'intake.ts', 'prose.ts', 'remote.ts'].every(shapesTheCache)).toBe(true);
});

/** The answers a capture recorded are not among the contracts at all: they live beside the client that asks for them. */
test('the cache buster reads no test', () => {
  expect(['article.test.ts', 'intake.test.ts'].filter(shapesTheCache)).toEqual([]);
});

/**
 * The catalogue shows every primitive and component, or its place says why one has no sample. A module written with
 * neither is what the registry used to skip in silence, while claiming that nothing could be forgotten.
 */
test('the catalogue names a module it neither shows nor excuses', () => {
  expect(catalogueGaps(['box', 'list', 'pager'], ['box'], { list: 'une raison' })).toEqual([
    'pager : aucune entrée au catalogue, et aucune raison de n’en pas avoir',
  ]);
});

/** A reason that excuses nothing is a claim about the app that has stopped being true, and is named like one. */
test('the catalogue names a reason that excuses a module shown, or a module gone', () => {
  expect(catalogueGaps(['box', 'list'], ['box', 'list'], { list: 'une raison', pager: 'une autre' })).toEqual([
    'list : une raison de n’être pas au catalogue, pour un module qui y est',
    'pager : une raison de n’être pas au catalogue, pour un module qui n’existe pas',
  ]);
});

test('a place whose every module is shown or excused leaves nothing to say', () => {
  expect(catalogueGaps(['box', 'list'], ['box'], { list: 'une raison' })).toEqual([]);
});
