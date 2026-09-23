import { ContentApiError } from '@huma/contracts';
import type { ArticleSummary, Page } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import type { InfiniteData, Query } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { feedQuery, searchQuery } from '#entities/article';
import { CACHE_BUSTER } from './cache-buster';
import { persistOptions, queryClient } from './query-client';

/** The retry policy the client applies by default, refused as a test if it is a count or a flag instead. */
const retryPolicy = (): ((failureCount: number, error: Error) => boolean) => {
  const retry = queryClient.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') {
    throw new Error('la politique de réessai n’est pas une fonction');
  }
  return retry;
};

describe('queryClient', () => {
  it('aligne gcTime sur le maxAge du persister', () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(persistOptions.maxAge);
  });

  it('bust le cache avec le hash généré des contrats', () => {
    expect(persistOptions.buster).toBe(CACHE_BUSTER);
  });

  it('réessaie une lecture qui peut encore passer, deux fois', () => {
    const retry = retryPolicy();
    expect(retry(0, new ContentApiError('unavailable', 'service indisponible'))).toBe(true);
    expect(retry(1, new ContentApiError('timeout', 'lecture expirée'))).toBe(true);
    expect(retry(2, new ContentApiError('unavailable', 'service indisponible'))).toBe(false);
  });

  it('ne réessaie ni un article absent ni un bogue', () => {
    const retry = retryPolicy();
    expect(retry(0, new ContentApiError('not-found', 'article introuvable'))).toBe(false);
    expect(retry(0, new Error('bogue'))).toBe(false);
  });

  it('écrit une lecture du journal sur le disque, et n’y écrit pas une question du lecteur', () => {
    const keep = persistOptions.dehydrateOptions?.shouldDehydrateQuery;
    if (keep === undefined) {
      throw new Error('rien ne décide de ce qui est écrit sur le disque');
    }
    // The real keys, not two written by hand: what is kept must be judged on what the app actually files things under.
    const answered: InfiniteData<Page<ArticleSummary>> = {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [''],
    };
    const client = new QueryClient();
    client.setQueryData(feedQuery.queryKey, answered);
    client.setQueryData(searchQuery('climat').queryKey, answered);
    const written = client
      .getQueryCache()
      .getAll()
      .filter((query: Query) => keep(query))
      .map((query: Query) => query.queryKey);
    // Dropped before the assertion: a cached reading holds a collection timer, which jest counts as work still running.
    client.clear();
    expect(written).toEqual([feedQuery.queryKey]);
  });
});
