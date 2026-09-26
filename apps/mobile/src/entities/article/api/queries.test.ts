import { ARTICLE_ID } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { questionOf } from '../model/search';
import { articleQuery, feedQuery, isReaderKey, searchQuery } from './queries';

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
