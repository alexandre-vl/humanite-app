import type { ArticleSummary, FeedQuery, LiveQuery, Page, SectionId } from '@huma/contracts';
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

/**
 * The key of every reading of articles, minted here and nowhere else. Two screens asking for the same pages under two
 * hand-written keys would each hold their own copy, and neither would see what the other had already read.
 */
const KEYS = {
  feed: (): readonly string[] => [ARTICLES, 'feed'],
  section: (section: SectionId): readonly string[] => [ARTICLES, 'section', section],
  live: (): readonly string[] => [ARTICLES, 'live'],
} as const;

/**
 * A feed read page by page: the key it is filed under, and the reading that turns a cursor into a page. Where the
 * pages come from is all that separates the three below, so it is all they state.
 */
const paged = (queryKey: readonly string[], read: (query: LiveQuery) => Promise<Page<ArticleSummary>>) =>
  infiniteQueryOptions({
    queryKey,
    queryFn: async ({ pageParam }) => read(at(pageParam)),
    initialPageParam: FIRST,
    getNextPageParam: (page) => page.nextCursor,
  });

/**
 * The options of a paged feed of articles: a screen composes them, it never writes them. The type is read off the
 * factory rather than off one of the three feeds, so naming it never ties every reader to what that one feed happens
 * to do today.
 */
export type PagedFeed = ReturnType<typeof paged>;

/** Every article, newest first, by pages: what the À la une screen reads. */
export const feedQuery = paged(KEYS.feed(), async (query) => content.getFeed(query));

/**
 * The articles of one section, newest first, by pages. The section is part of the key, so each one keeps the pages it
 * has already read, and coming back to a section does not throw away what another one is holding.
 */
export const sectionFeedQuery = (section: SectionId): PagedFeed =>
  paged(KEYS.section(section), async (query) => {
    const filtered: FeedQuery = { ...query, section };
    return content.getFeed(filtered);
  });

/** The same articles as a running wire: what the En continu screen reads. */
export const liveFeedQuery = paged(KEYS.live(), async (query) => content.getLiveFeed(query));
