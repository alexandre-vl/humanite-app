import { ARTICLE_ID } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { articleQuery, feedQuery, isReaderKey, searchQuery } from './queries';

describe('searchQuery', () => {
  it('ne pose pas de question tant que le texte n’en est pas une', () => {
    expect(searchQuery('').enabled).toBe(false);
    expect(searchQuery('c').enabled).toBe(false);
    expect(searchQuery('climat').enabled).toBe(true);
  });
});

describe('isReaderKey', () => {
  /** A question the reader typed is theirs, and stays off the disk; a reading of the paper is kept there. */
  it('reconnaît une question du lecteur, et elle seule', () => {
    expect(isReaderKey(searchQuery('climat').queryKey)).toBe(true);
    expect(isReaderKey(feedQuery.queryKey)).toBe(false);
    expect(isReaderKey(articleQuery(ARTICLE_ID.parse('pol-a1')).queryKey)).toBe(false);
  });
});
