import type {
  Article,
  ArticleId,
  ArticleSummary,
  FeedQuery,
  LiveQuery,
  Page,
  SearchQuery,
  SectionId,
} from '@huma/contracts';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { content } from '#api';
import { searchable } from '../model/search';

/** The root every article key starts with: one entity, one namespace in the cache the app persists. */
const ARTICLES = 'articles';

/**
 * The branch a reader's question is filed under. It is named apart from the other keys because the app asks about it:
 * a question is worth answering from memory while the reader is still on the screen, and not worth keeping on disk
 * after — see the persistence options, which read this and nothing else about a key.
 */
const SEARCH = 'search';

/**
 * The newsroom's own namespace. The roster is read from here rather than from an author entity of its own: an article
 * names its authors by id, only a reading screen ever needs the names behind them, and a slice with a single reader is
 * one the structure check refuses. It stays a key apart, so the roster is fetched once however many articles are read.
 */
const AUTHORS = 'authors';

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
  search: (text: string): readonly string[] => [ARTICLES, SEARCH, text],
  one: (id: ArticleId): readonly string[] => [ARTICLES, 'one', id],
  summaries: (ids: readonly ArticleId[]): readonly string[] => [ARTICLES, 'summaries', ...ids],
  authors: (): readonly string[] => [AUTHORS],
} as const;

/**
 * A feed read page by page: the key it is filed under, the reading that turns a cursor into a page, and whether it is
 * to be read at all. Where the pages come from is nearly all that separates the four below, so it is nearly all they
 * state.
 */
const paged = (
  queryKey: readonly string[],
  read: (query: LiveQuery) => Promise<Page<ArticleSummary>>,
  enabled = true,
) =>
  infiniteQueryOptions({
    queryKey,
    queryFn: async ({ pageParam }) => read(at(pageParam)),
    initialPageParam: FIRST,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
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

/**
 * The articles a reader's question reaches, newest first, by pages. The question is asked of the content only once it
 * is one: an empty field would otherwise fetch the whole paper — the content matches every article against nothing —
 * and a single letter very nearly all of it.
 */
export const searchQuery = (text: string): PagedFeed =>
  paged(
    KEYS.search(text),
    async (query) => {
      const asked: SearchQuery = { ...query, text };
      return content.search(asked);
    },
    searchable(text),
  );

/** Whether a key in the cache is a reader's question rather than a reading of the paper. */
export const isSearchKey = (key: readonly unknown[]): boolean => key[0] === ARTICLES && key[1] === SEARCH;

/** One reading of the content under one key, whatever it answers with. */
const single = <Value>(queryKey: readonly string[], read: () => Promise<Value>) =>
  queryOptions({ queryKey, queryFn: async () => read() });

/** The options of one such reading, read off the factory rather than off any one of the readings below. */
type Single<Value> = ReturnType<typeof single<Value>>;

/** One article, body and all: what the reading screen reads. */
export const articleQuery = (id: ArticleId): Single<Article> =>
  single(KEYS.one(id), async () => content.getArticle(id));

/**
 * The summaries a reading screen needs to announce the articles a body points at. They are read as summaries and not
 * as articles: a summary carries everything a card shows and none of the body behind it, which over the corpus is a
 * fifth of the bytes, and one call answers for however many the body names.
 */
export const summariesQuery = (ids: readonly ArticleId[]): Single<readonly ArticleSummary[]> =>
  single(KEYS.summaries(ids), async () => content.getSummaries(ids));

/**
 * The newsroom, which a byline reads to turn the ids an article carries into names. Like the sections it is the
 * paper's own list, not the reader's: nothing a reader does makes it stale.
 */
export const authorsQuery = queryOptions({
  queryKey: KEYS.authors(),
  queryFn: async () => content.getAuthors(),
  staleTime: Infinity,
});
