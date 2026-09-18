import { ContentApiError } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
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
});
