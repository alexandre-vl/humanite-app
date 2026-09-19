import type { FeedQuery, LiveQuery, SectionId } from '@huma/contracts';
import { infiniteQueryOptions } from '@tanstack/react-query';
import { content } from '#api';

/** The root every article key starts with: one entity, one namespace in the cache the app persists. */
const ARTICLES = 'articles';

/**
 * No cursor at all: the content serves the first page to a query that asks for none. It is an empty string rather than
 * `null` because the cursor type is read off this value — `null` would fix it to `null` and the cursors the content
 * mints would no longer fit.
 */
const FIRST = '';

/** The query that reads the page `cursor` opens, a cursor staying an opaque string the content alone mints. */
const at = (cursor: string): LiveQuery => (cursor === FIRST ? {} : { cursor });

/** Every article, newest first, by pages: what the À la une screen reads. */
export const feedQuery = infiniteQueryOptions({
  queryKey: [ARTICLES, 'feed'],
  queryFn: async ({ pageParam }) => content.getFeed(at(pageParam)),
  initialPageParam: FIRST,
  getNextPageParam: (page) => page.nextCursor,
});

/** The same page of one section, the filter the content applies before it counts the pages. */
const inSection = (section: SectionId, cursor: string): FeedQuery => ({ ...at(cursor), section });

/**
 * The articles of one section, newest first, by pages. The section is part of the key, so each one keeps the pages it
 * has already read, and coming back to a section does not throw away what another one is holding.
 */
export const sectionFeedQuery = (section: SectionId): FeedOptions =>
  infiniteQueryOptions({
    queryKey: [ARTICLES, 'section', section],
    queryFn: async ({ pageParam }) => content.getFeed(inSection(section, pageParam)),
    initialPageParam: FIRST,
    getNextPageParam: (page) => page.nextCursor,
  });

/** The same articles as a running wire: what the En continu screen reads. */
export const liveFeedQuery = infiniteQueryOptions({
  queryKey: [ARTICLES, 'live'],
  queryFn: async ({ pageParam }) => content.getLiveFeed(at(pageParam)),
  initialPageParam: FIRST,
  getNextPageParam: (page) => page.nextCursor,
});

/** The options of a paged feed of articles: a screen composes them, it never writes them. */
export type FeedOptions = typeof feedQuery;
