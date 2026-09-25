import { ARTICLE_ID, ARTICLE_SUMMARY, QUESTION } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import { content } from '#api';
import { everyArticle } from '#lib/testing';
import { questionOf } from '../model/search';
import { articleQuery, feedQuery, isReaderKey, searchQuery, summariesMatching } from './queries';
import type { PagedFeed } from './queries';

describe('questionOf', () => {
  /** The blank at either end is the reader's typing, not their question, and is read off once, here. */
  it('pose les mots du lecteur sans le blanc qui les entoure', () => {
    expect(questionOf('  climat ')).toBe('climat');
  });

  it('ne pose pas de question tant que le texte n’en est pas une', () => {
    expect(questionOf('')).toBeNull();
    expect(questionOf('   ')).toBeNull();
    expect(questionOf(' c ')).toBeNull();
  });
});

describe('searchQuery', () => {
  it('ne demande rien au contenu sans question, et le demande dès qu’il y en a une', () => {
    expect(searchQuery(questionOf('c')).enabled).toBe(false);
    expect(searchQuery(questionOf('climat')).enabled).toBe(true);
  });
});

describe('isReaderKey', () => {
  /** A question the reader typed is theirs, and stays off the disk; a reading of the paper is kept there. */
  it('reconnaît une question du lecteur, et elle seule', () => {
    expect(isReaderKey(searchQuery(questionOf('climat')).queryKey)).toBe(true);
    expect(isReaderKey(feedQuery.queryKey)).toBe(false);
    expect(isReaderKey(articleQuery(ARTICLE_ID.parse('pol-a1')).queryKey)).toBe(false);
  });
});

/** A cache that has read one list, of articles printed under these titles and with nothing under them. */
const holding = async (titles: readonly string[], lists: readonly PagedFeed[] = [feedQuery]): Promise<QueryClient> => {
  const corpus = await everyArticle(content);
  const items = titles.map((title, at) => {
    const real = corpus[at];
    if (real === undefined) {
      throw new Error('le corpus n’a pas assez d’articles : le test ne vérifierait rien');
    }
    return ARTICLE_SUMMARY.parse({ ...real, title, standfirst: undefined, excerpt: undefined });
  });
  // Kept for good: a cache that collects what nobody watches holds a timer for it, which outlives the test and keeps
  // the run from ending.
  const cache = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  for (const list of lists) {
    cache.setQueryData(list.queryKey, { pages: [{ items, nextCursor: null }], pageParams: [null] });
  }
  return cache;
};

const titlesMatching = (cache: QueryClient, words: string): readonly string[] =>
  summariesMatching(cache, QUESTION.parse(words)).map((summary) => summary.title);

describe('summariesMatching', () => {
  /**
   * A question is looked for where a word starts, as a reader looks for one. Looked for anywhere, « mn » — what was
   * left of « macron » typed too fast — found « Amnesty International » in a title and stood it in for the answer
   * (iPhone simulator, 25/09/2026).
   */
  it('ne trouve une question qu’au début d’un mot', async () => {
    const cache = await holding([
      'Amnesty International exige la dissolution de la police de l’immigration',
      'Mnémosyne, ou la mémoire des peuples',
      'Rentrée : l’école manque de bras',
      'Un départ',
    ]);
    expect(titlesMatching(cache, 'mn')).toEqual(['Mnémosyne, ou la mémoire des peuples']);
    expect(titlesMatching(cache, 'ecole')).toEqual(['Rentrée : l’école manque de bras']);
    expect(titlesMatching(cache, 'part')).toEqual([]);
  });

  /** A question is the reader's words and nothing else: a sign that means something to a pattern means nothing here. */
  it('lit une question telle qu’elle est tapée, signes compris', async () => {
    const cache = await holding(['Qui paie (vraiment) la dette ?', 'La dette, vraiment']);
    expect(titlesMatching(cache, '(vraiment')).toEqual(['Qui paie (vraiment) la dette ?']);
    expect(titlesMatching(cache, 'dette ?')).toEqual(['Qui paie (vraiment) la dette ?']);
  });

  /**
   * An article is filed in more than one list the app reads — the front, its section, the wire, every answer that has
   * reached it — and the app answered from all of them at once. What it answered « volksw » with was seven lines for
   * two articles (iPhone simulator, 25/09/2026).
   */
  it('ne donne qu’une fois un article que l’app tient dans plusieurs listes', async () => {
    const cache = await holding(
      ['Saignée de 100 000 emplois chez Volkswagen'],
      [feedQuery, searchQuery(QUESTION.parse('volk')), searchQuery(QUESTION.parse('volks'))],
    );
    expect(titlesMatching(cache, 'volksw')).toEqual(['Saignée de 100 000 emplois chez Volkswagen']);
  });
});
