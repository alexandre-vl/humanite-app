import type { ArticleId, ArticleSummary } from '@huma/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { summaryAmongRead } from '../api/queries';

/**
 * What the app already knows of one article, from every list it has read, settled once when the screen opens.
 *
 * It is read into state rather than recomputed on every render, and for two reasons. A screen that found the summary
 * on its first pass and lost it on a later one — a list scrolled out of the cache, a reader signed in and every
 * reading reset — would take the head back off the page it had already drawn, which is worse than never having drawn
 * it. And the answer is a fact about the moment of opening: an article reached from a list is known, one reached from
 * a link is not, and nothing that happens afterwards makes either more or less true.
 *
 * Nothing subscribes. The cache is asked once, in the initialiser, which React runs on the first render alone.
 */
export const useReadSummary = (id: ArticleId): ArticleSummary | null => {
  const cache = useQueryClient();
  const [known] = useState(() => summaryAmongRead(cache, id));
  return known;
};
