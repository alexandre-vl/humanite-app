import { ARTICLE, blocksOf } from '@huma/contracts';
import type { SectionId } from '@huma/contracts';
import type { CorpusArticle } from './index.ts';
import { expect, test } from 'vitest';
import { CORPUS } from './index.ts';
import { isBrief, validateCorpus } from './validate.ts';

/** The first item that carries a lead picture, to bend one rule at a time against a body that breaks none. */
const illustrated = (): CorpusArticle => {
  const article = CORPUS.find((each) => each.hero !== undefined);
  if (article === undefined) {
    throw new Error('aucun item illustré dans le corpus');
  }
  return article;
};

/** An item beside the folder it was filed in, which is the section the corpus wrote it for. */
const filed = (article: CorpusArticle): Readonly<{ folder: SectionId; article: CorpusArticle }> => ({
  folder: article.section,
  article,
});

/** The same item with some of its fields changed, read again by the contracts, and still filed where it was. */
const bent = (article: CorpusArticle, change: Readonly<Record<string, unknown>>): CorpusArticle => ({
  ...ARTICLE.parse({ ...article, ...change }),
  section: article.section,
});

/** Only the errors that name one thing: a corpus of one item fails every count and presence rule besides. */
const errorsAbout = (article: CorpusArticle, word: string): readonly string[] =>
  validateCorpus([filed(article)]).filter((error) => error.includes(word));

/** Only what the picture keys are judged on. */
const errorsFor = (article: CorpusArticle): readonly string[] => errorsAbout(article, 'clé d’image');

test('the corpus as built meets every rule it is held to', () => {
  expect(validateCorpus(CORPUS.map(filed))).toEqual([]);
});

test('a lead picture keyed to another item is refused', () => {
  const borrowed = bent(illustrated(), {
    hero: {
      picture: { kind: 'corpus', key: 'zzz-a1-hero' },
      caption: 'Une légende',
      credit: 'Photo : X / CC BY 4.0',
    },
  });
  expect(errorsFor(borrowed)).toEqual([expect.stringContaining('hors de l’item')]);
});

/**
 * The three rules below moved here out of `ARTICLE_SUMMARY`, which had to widen to describe the journal's own service
 * as well as this corpus. They would otherwise have been dropped rather than moved, and nothing would have said so.
 * A fourth, on how many subjects an item carries, went with the field itself the day nothing could fill it.
 */

test('a title or a standfirst outside what this corpus measures is refused', () => {
  const article = illustrated();
  expect(errorsAbout(bent(article, { title: 'Climat' }), 'titre de')).toEqual([expect.stringContaining('6 signes')]);
  expect(errorsAbout(bent(article, { standfirst: undefined }), 'chapô de')).toEqual([
    expect.stringContaining('0 signes'),
  ]);
});

test('an item of this corpus carries a byline', () => {
  const signed = illustrated();
  const unsigned = Object.fromEntries(Object.entries(signed).filter(([field]) => field !== 'byline'));
  expect(errorsAbout({ ...ARTICLE.parse(unsigned), section: signed.section }, 'auteur(s)')).toEqual([
    expect.stringContaining('0 auteur(s)'),
  ]);
  expect(errorsAbout(bent(signed, { byline: 'Quelqu’un d’autre' }), 'auteur')).toEqual([
    expect.stringContaining('auteur inconnu'),
  ]);
});

/** An item named as a brief is held to a brief's shape, the name being the one place a brief is written. */
test('an item named as a brief is held to what a brief may hold', () => {
  const brief = CORPUS.find(isBrief);
  if (brief === undefined) {
    throw new Error('aucune brève dans le corpus');
  }
  const blocks = blocksOf(brief);
  const swollen = bent(brief, { body: { kind: 'open', blocks: [...blocks, ...blocks, ...blocks] } });
  expect(errorsAbout(swollen, 'trois paragraphes')).toEqual([expect.stringContaining('au plus trois paragraphes')]);
});

test('one picture key cannot serve two pictures', () => {
  const article = illustrated();
  const twice = bent(article, {
    body: {
      kind: 'open',
      blocks: [
        { type: 'image', picture: { kind: 'corpus', key: `${article.id}-hero` }, caption: 'La même image, deux fois' },
        ...blocksOf(article),
      ],
    },
  });
  expect(errorsFor(twice)).toEqual([expect.stringContaining('employée par deux items')]);
});
