import { describe, expect, expectTypeOf, test } from 'vitest';
import type { MessageDetails } from './messages.ts';
import { placeholders, renderMessage } from './messages.ts';

describe('MessageDetails', () => {
  test('requires exactly the placeholders of a literal template', () => {
    expectTypeOf<MessageDetails<'{id} passé de {from} à {to}'>>().toEqualTypeOf<
      Readonly<Record<'id' | 'from' | 'to', string | number | readonly (string | number)[]>>
    >();
  });

  test('accepts no value for a template without placeholder', () => {
    expectTypeOf<MessageDetails<'aucun en-tête'>>().toEqualTypeOf<Readonly<Record<string, never>>>();
    expectTypeOf<{ stray: number }>().not.toExtend<MessageDetails<'aucun en-tête'>>();
  });

  test('accepts nothing for a template widened to string', () => {
    expectTypeOf<MessageDetails<string>>().toBeNever();
  });
});

test('placeholders lists the names and refuses a placeholder that is not a word', () => {
  expect(placeholders('x/y', '{id} passé de {from}')).toEqual(['id', 'from']);
  expect(() => placeholders('x/y', 'fichier {file-name} absent')).toThrow('x/y : espace réservé invalide {file-name}');
  expect(() => placeholders('x/y', 'double {{id}}')).toThrow('espace réservé invalide {{id}');
});

test('renderMessage fills each placeholder and names the owner of a missing value', () => {
  expect(renderMessage('x/y', '{id} : {list}', { id: 'ADR-0001', list: ['a', 2] })).toBe('ADR-0001 : a, 2');
  expect(() => renderMessage('x/y', '{id} absent', {})).toThrow('x/y : valeur manquante pour {id}');
});

test('placeholders and renderMessage read a long template without a closing brace in linear time', () => {
  const template = `${'{'.repeat(100_000)} sans fin`;
  const started = performance.now();
  expect(placeholders('x/y', template)).toEqual([]);
  expect(renderMessage('x/y', template, {})).toBe(template);
  expect(performance.now() - started).toBeLessThan(1_000);
});
