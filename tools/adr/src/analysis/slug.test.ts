import { expect, test } from 'vitest';
import { slugify } from './slug.ts';

test.each([
  ['Décisions d’architecture en ADR vérifiés', 'decisions-d-architecture-en-adr-verifies'],
  ['Cœur du système, étape 2', 'coeur-du-systeme-etape-2'],
  ['Routes hors src et couche _app', 'routes-hors-src-et-couche-app'],
  ['  Espaces   et « guillemets »  ', 'espaces-et-guillemets'],
  ['!!!', ''],
])('%s → %s', (title, slug) => {
  expect(slugify(title)).toBe(slug);
});
