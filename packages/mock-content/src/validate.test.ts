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

/** Only the errors that name one thing: a corpus of one item fails every count and presence rule besides. */
const errorsAbout = (article: Article, word: string): readonly string[] =>
  validateCorpus([{ folder: article.section, article }]).filter((error) => error.includes(word));

/** Only what the picture keys are judged on. */
const errorsFor = (article: Article): readonly string[] => errorsAbout(article, 'clé d’image');

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

/**
 * The four rules below moved here out of `ARTICLE_SUMMARY`, which had to widen to describe the journal's own service
 * as well as this corpus. They would otherwise have been dropped rather than moved, and nothing would have said so.
 */

test('a title or a standfirst outside what this corpus measures is refused', () => {
  const article = illustrated();
  expect(errorsAbout(ARTICLE.parse({ ...article, title: 'Climat' }), 'titre de')).toEqual([
    expect.stringContaining('6 signes'),
  ]);
  expect(errorsAbout(ARTICLE.parse({ ...article, standfirst: '' }), 'chapô de')).toEqual([
    expect.stringContaining('0 signes'),
  ]);
});

test('an item of this corpus carries a byline and its tags', () => {
  const article = illustrated();
  expect(errorsAbout(ARTICLE.parse({ ...article, authors: [] }), 'auteur(s)')).toEqual([
    expect.stringContaining('0 auteur(s)'),
  ]);
  expect(errorsAbout(ARTICLE.parse({ ...article, tags: [] }), 'mot-clé(s)')).toEqual([
    expect.stringContaining('0 mot-clé(s)'),
  ]);
});

test('one picture key cannot serve two pictures', () => {
  const article = illustrated();
  const twice = ARTICLE.parse({
    ...article,
    blocks: [{ type: 'image', caption: 'La même image, deux fois', key: `${article.id}-hero` }, ...article.blocks],
  });
  expect(errorsFor(twice)).toEqual([expect.stringContaining('employée par deux items')]);
});
