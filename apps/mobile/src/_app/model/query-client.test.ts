import { describe, expect, it } from '@jest/globals';
import { CACHE_BUSTER } from './cache-buster';
import { persistOptions, queryClient } from './query-client';

describe('queryClient', () => {
  it('aligne gcTime sur le maxAge du persister', () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(persistOptions.maxAge);
  });

  it('bust le cache avec le hash généré des contrats', () => {
    expect(persistOptions.buster).toBe(CACHE_BUSTER);
  });
});
