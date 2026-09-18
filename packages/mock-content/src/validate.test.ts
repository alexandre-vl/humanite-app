import { ARTICLE } from '@huma/contracts';
import type { Article } from '@huma/contracts';
import { expect, test } from 'vitest';
import { CORPUS } from './index.ts';
import { validateCorpus } from './validate.ts';

/** The first item that carries a lead picture, to bend one rule at a time against a body that breaks none. */
const illustrated = (): Article => {
  const article = CORPUS.find((each) => each.hero !== undefined);
  if (article === undefined) {
    throw new Error('aucun item illustré dans le corpus');
  }
  return article;
};

/** Only what the picture keys are judged on: a corpus of one item fails every count and presence rule besides. */
const errorsFor = (article: Article): readonly string[] =>
  validateCorpus([{ folder: article.section, article }]).filter((error) => error.includes('clé d’image'));

test('the corpus as built names no picture it should not', () => {
  expect(validateCorpus(CORPUS.map((article) => ({ folder: article.section, article })))).toEqual([]);
});

test('a lead picture keyed to another item is refused', () => {
  const borrowed = ARTICLE.parse({
    ...illustrated(),
    hero: { key: 'zzz-a1-hero', caption: 'Une légende', credit: 'Photo : X / CC BY 4.0' },
  });
  expect(errorsFor(borrowed)).toEqual([expect.stringContaining('hors de l’item')]);
});

test('one picture key cannot serve two pictures', () => {
  const article = illustrated();
  const twice = ARTICLE.parse({
    ...article,
    blocks: [{ type: 'image', caption: 'La même image, deux fois', key: `${article.id}-hero` }, ...article.blocks],
  });
  expect(errorsFor(twice)).toEqual([expect.stringContaining('employée par deux items')]);
});
