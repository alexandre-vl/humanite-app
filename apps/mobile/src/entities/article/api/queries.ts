import type {
  Article,
  ArticleId,
  ArticleSummary,
  FeedQuery,
  Page,
  PageQuery,
  SearchQuery,
  SectionId,
} from '@huma/contracts';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { content } from '#api';
import { searchable } from '../model/search';

/** The root every article key starts with: one entity, one namespace in the cache the app persists. */
const ARTICLES = 'articles';

/**
 * The two branches a reading of the reader's own making is filed under: what they asked for, and what they kept.
 *
 * They are named apart from the rest because the app asks about them: such a reading is worth answering from memory
 * while the reader is still on the screen, and not worth keeping on disk after — see the persistence options, which
 * read this and nothing else about a key.
 */
const SEARCH = 'search';
const KEPT = 'kept';

/**
 * No cursor at all: the content serves the first page to a query that asks for none. It is an empty string rather than
 * `null` because the cursor type is read off this value — `null` would fix it to `null` and the cursors the content
 * mints would no longer fit.
 */
const FIRST = '';

/** The query that reads the page `cursor` opens, a cursor staying an opaque string the content alone mints. */
const at = (cursor: string): PageQuery => (cursor === FIRST ? {} : { cursor });

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
  kept: (ids: readonly ArticleId[]): readonly string[] => [ARTICLES, KEPT, ...ids],
} as const;

/**
 * A feed read page by page: the key it is filed under, the reading that turns a cursor into a page, and whether it is
 * to be read at all. Where the pages come from is nearly all that separates the four below, so it is nearly all they
 * state.
 */
const paged = (
  queryKey: readonly string[],
  read: (query: PageQuery) => Promise<Page<ArticleSummary>>,
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

/** The front, in the order its source lays it out: what the À la une screen reads. */
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

/** The running wire, the newest first: what the En continu screen reads. */
export const liveFeedQuery = paged(KEYS.live(), async (query) => content.getLiveFeed(query));

/**
 * The articles a reader's question reaches, in the order the source ranks them, by pages. The question is asked of the
 * content only once it is one: an empty field or a single letter would ask for very nearly the whole paper.
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

/** Whether a key in the cache is a reading of the reader's own making rather than a reading of the paper. */
export const isReaderKey = (key: readonly unknown[]): boolean =>
  key[0] === ARTICLES && (key[1] === SEARCH || key[1] === KEPT);

/** One reading of the content under one key, whatever it answers with, and whether it is to be read at all. */
const single = <Value>(queryKey: readonly string[], read: () => Promise<Value>, enabled = true) =>
  queryOptions({ queryKey, queryFn: async () => read(), enabled });

/** The options of one such reading, read off the factory rather than off any one of the readings below. */
type Single<Value> = ReturnType<typeof single<Value>>;

/** One article, body and all: what the reading screen reads. */
export const articleQuery = (id: ArticleId): Single<Article> =>
  single(KEYS.one(id), async () => content.getArticle(id));

/**
 * The summaries a screen needs to announce a set of articles it already knows the ids of. They are read as summaries
 * and not as articles: a summary carries everything a card shows and none of the body behind it, which over the corpus
 * is a fifth of the bytes, and one call answers for however many are named.
 *
 * No ids, no question. A screen asks before it knows which articles it is announcing — a body that has not arrived
 * names none, a reader who has kept none has none — and an empty list asked for is still a reading, filed in the cache
 * and written to disk with the rest.
 */
export const summariesQuery = (ids: readonly ArticleId[]): Single<readonly ArticleSummary[]> =>
  single(KEYS.summaries(ids), async () => content.getSummaries(ids), ids.length > 0);

/**
 * The same reading, for the list the reader keeps rather than for the one an article points at. It is the same call
 * and a different question: this one is theirs, it is a different one after every mark they make, and it is answered
 * from the corpus the app carries — so it is filed apart, and stays out of what is written to disk.
 */
export const keptQuery = (ids: readonly ArticleId[]): Single<readonly ArticleSummary[]> =>
  single(KEYS.kept(ids), async () => content.getSummaries(ids), ids.length > 0);
