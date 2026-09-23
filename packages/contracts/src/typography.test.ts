import { expect, test } from 'vitest';
import { typeset } from './typography.ts';

test('typeset holds the high punctuation and the guillemets to their words', () => {
  expect(typeset('Budget 2027 : Lecornu drague le PS')).toBe('Budget 2027\u00A0: Lecornu drague le PS');
  expect(typeset('Pourquoi « Oradour » échoue ; vraiment ? Oui !')).toBe(
    'Pourquoi «\u00A0Oradour\u00A0» échoue\u00A0; vraiment\u00A0? Oui\u00A0!',
  );
  expect(typeset('une hausse de 25 %')).toBe('une hausse de 25\u00A0%');
});

test('typeset sets the apostrophe after a letter, whatever follows it', () => {
  expect(typeset("ministre de l'Économie")).toBe('ministre de l’Économie');
  expect(typeset("aujourd'hui")).toBe('aujourd’hui');
  // A run of emphasis can start right after the apostrophe: the word it elides is in the next run.
  expect(typeset("d'")).toBe('d’');
});

test('typeset holds an initial to the name after it, and leaves a sentence ending alone', () => {
  expect(typeset('R. Lefebvre et J.-L. Mélenchon')).toBe('R.\u00A0Lefebvre et J.-L.\u00A0Mélenchon');
  expect(typeset('Une seconde phrase. Puis une autre')).toBe('Une seconde phrase. Puis une autre');
  expect(typeset('le PCF. Le parti')).toBe('le PCF. Le parti');
});

test('typeset adds no blank the text did not have, and changes nothing twice', () => {
  expect(typeset('Budget 2027: Lecornu')).toBe('Budget 2027: Lecornu');
  expect(typeset('«Oradour»')).toBe('«Oradour»');
  const once = typeset("Pourquoi « Oradour » : l'été, R. Lefebvre ?");
  expect(typeset(once)).toBe(once);
});
