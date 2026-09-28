import { ARTICLE_SLUG } from '@huma/contracts';
import type { ArticleSummary, Page } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import { content } from '#api';
import { destinationOf } from './alerts';

/** The address of an article's page, as the journal's site writes one and an alert points at it. */
const PAGE = 'https://www.humanite.fr/monde/allemagne/elections-en-allemagne-victoire-de-la-gauche';
const SLUG = ARTICLE_SLUG.parse('elections-en-allemagne-victoire-de-la-gauche');

// A cache holds a timer for each reading it keeps, which would hold the bench open after the last test.
const caches: QueryClient[] = [];
const cacheOf = (): QueryClient => {
  const cache = new QueryClient();
  caches.push(cache);
  return cache;
};

afterEach(() => {
  jest.restoreAllMocks();
  for (const cache of caches.splice(0)) {
    cache.clear();
  }
});

/** The wire as the journal would answer it, its first article renamed with `slug`. */
const wireNaming = async (slug: string): Promise<Page<ArticleSummary>> => {
  const [first] = (await content.getFeed({})).items;
  if (first === undefined) {
    throw new Error('le corpus n’a servi aucun article à la une');
  }
  return { items: [{ ...first, slug: ARTICLE_SLUG.parse(slug) }], nextCursor: null };
};

describe('destinationOf', () => {
  it('ouvre dans le lecteur de l’app l’article dont l’alerte montre la page', async () => {
    const wire = await wireNaming(SLUG);
    jest.spyOn(content, 'getLiveFeed').mockResolvedValue(wire);
    expect(await destinationOf(cacheOf(), `${PAGE}?utm_source=onesignal`)).toEqual({
      kind: 'article',
      id: wire.items[0]?.id,
    });
  });

  it('ouvre là où elle vit une page qui ne nomme aucun article, sans rien demander au journal', async () => {
    const asked = jest.spyOn(content, 'getLiveFeed');
    const address = 'https://www.humanite.fr/';
    expect(await destinationOf(cacheOf(), address)).toEqual({ kind: 'page', address });
    expect(asked).not.toHaveBeenCalled();
  });

  it('ouvre la page d’un article que ni la lecture ni le fil ne portent', async () => {
    jest.spyOn(content, 'getLiveFeed').mockResolvedValue(await wireNaming('un-autre-article'));
    expect(await destinationOf(cacheOf(), PAGE)).toEqual({ kind: 'page', address: PAGE });
  });

  it('ouvre la page quand le journal n’a pas pu dire quel article elle nomme', async () => {
    jest.spyOn(content, 'getLiveFeed').mockRejectedValue(new Error('pas de réseau'));
    expect(await destinationOf(cacheOf(), PAGE)).toEqual({ kind: 'page', address: PAGE });
  });
});
