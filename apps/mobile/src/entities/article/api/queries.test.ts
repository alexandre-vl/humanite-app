import { ARTICLE_ID } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { feedQuery, isReaderKey, keptQuery, searchQuery, summariesQuery } from './queries';

const ID = ARTICLE_ID.parse('pol-a1');

describe('summariesQuery', () => {
  /**
   * A screen asks before it knows which articles it is announcing: a body that has not arrived names none, a reader
   * who has kept none has none. Asked all the same, that empty question is a reading like any other — filed in the
   * cache under its own key and written to disk with the rest, for an answer nobody can use.
   */
  it('ne pose pas de question quand elle ne porte sur aucun article', () => {
    expect(summariesQuery([]).enabled).toBe(false);
    expect(summariesQuery([ID]).enabled).toBe(true);
  });

  it('classe chaque lot sous les articles qu’il nomme, et sous eux seuls', () => {
    expect(summariesQuery([ID]).queryKey).toEqual(['articles', 'summaries', ID]);
    expect(summariesQuery([]).queryKey).not.toEqual(summariesQuery([ID]).queryKey);
  });
});

describe('searchQuery', () => {
  it('ne pose pas de question tant que le texte n’en est pas une', () => {
    expect(searchQuery('').enabled).toBe(false);
    expect(searchQuery('c').enabled).toBe(false);
    expect(searchQuery('climat').enabled).toBe(true);
  });
});

describe('keptQuery', () => {
  it('ne demande rien d’une liste qui ne nomme aucun article', () => {
    expect(keptQuery([]).enabled).toBe(false);
    expect(keptQuery([ID]).enabled).toBe(true);
  });

  /**
   * The same call, asked for two different reasons: what a body points at is the paper's, what the reader kept is
   * theirs. Filed together, the second would be written to disk with the first — a key more after every mark made.
   */
  it('range la liste du lecteur ailleurs que celle qu’un article nomme', () => {
    expect(keptQuery([ID]).queryKey).not.toEqual(summariesQuery([ID]).queryKey);
    expect(isReaderKey(keptQuery([ID]).queryKey)).toBe(true);
    expect(isReaderKey(searchQuery('climat').queryKey)).toBe(true);
    expect(isReaderKey(summariesQuery([ID]).queryKey)).toBe(false);
    expect(isReaderKey(feedQuery.queryKey)).toBe(false);
  });
});
