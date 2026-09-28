import { ARTICLE_ID, ARTICLE_SLUG } from '@huma/contracts';
import type { ArticleId, ArticleSummary, Page } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { content } from '#api';
import { questionOf } from '../model/search';
import { articleOfSlug, articleQuery, feedQuery, isReaderKey, searchQuery } from './queries';

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

describe('articleOfSlug', () => {
  const SLUG = ARTICLE_SLUG.parse('elections-en-allemagne-victoire-de-la-gauche');

  // A cache holds a timer for each reading it keeps, which would hold the bench open after the last test.
  const caches: QueryClient[] = [];
  const cacheOf = (): QueryClient => {
    const cache = new QueryClient();
    caches.push(cache);
    return cache;
  };

  /** A cache holding the front's first page, its first article renamed as the journal's site would name it. */
  const seeded = async (): Promise<Readonly<{ cache: QueryClient; id: ArticleId }>> => {
    const [first] = (await content.getFeed({})).items;
    if (first === undefined) {
      throw new Error('le corpus n’a servi aucun article à la une');
    }
    const cache = cacheOf();
    const page: Page<ArticleSummary> = { items: [{ ...first, slug: SLUG }], nextCursor: null };
    cache.setQueryData(feedQuery.queryKey, { pages: [page], pageParams: [''] });
    return { cache, id: first.id };
  };

  afterEach(() => {
    jest.restoreAllMocks();
    for (const cache of caches.splice(0)) {
      cache.clear();
    }
  });

  it('trouve l’article parmi ce que l’app a lu, sans rien demander au journal', async () => {
    const { cache, id } = await seeded();
    const asked = jest.spyOn(content, 'getLiveFeed');
    expect(await articleOfSlug(cache, SLUG)).toBe(id);
    expect(asked).not.toHaveBeenCalled();
  });

  it('le cherche parmi les derniers articles du fil quand rien de lu ne le porte', async () => {
    const { cache, id } = await seeded();
    const justFiled = cache.getQueryData<InfiniteData<Page<ArticleSummary>>>(feedQuery.queryKey)?.pages[0];
    jest.spyOn(content, 'getLiveFeed').mockResolvedValue(justFiled ?? { items: [], nextCursor: null });
    expect(await articleOfSlug(cacheOf(), SLUG)).toBe(id);
  });

  it('ne nomme aucun article quand ni la lecture ni le fil ne portent ce nom', async () => {
    const { cache } = await seeded();
    expect(await articleOfSlug(cache, ARTICLE_SLUG.parse('un-article-plus-ancien'))).toBeNull();
  });
});
