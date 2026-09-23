import type {
  Article,
  ArticleId,
  ArticleSummary,
  FeedQuery,
  Page,
  PageQuery,
  Question,
  SearchQuery,
  SectionId,
} from '@huma/contracts';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { content } from '#api';

/** The root every article key starts with: one entity, one namespace in the cache the app persists. */
const ARTICLES = 'articles';

/**
 * The branch a reading of the reader's own making is filed under: what they asked for.
 *
 * It is named apart from the rest because the app asks about it: such a reading is worth answering from memory while
 * the reader is still on the screen, and not worth keeping on disk after — see the persistence options, which read
 * this and nothing else about a key.
 */
const SEARCH = 'search';

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
 * factory rather than off one of the four feeds, so naming it never ties every reader to what that one feed happens
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

/** What a search that asks nothing holds: no page, and none after it. */
const UNASKED: Page<ArticleSummary> = { items: [], nextCursor: null };

/**
 * The articles a reader's question reaches, in the order the source ranks them, by pages. The content is asked only
 * once there is a question: an empty field or a single letter would ask for very nearly the whole paper, and until
 * then the reading stands idle under a key of its own.
 */
export const searchQuery = (question: Question | null): PagedFeed =>
  question === null
    ? paged(KEYS.search(''), async () => Promise.resolve(UNASKED), false)
    : paged(KEYS.search(question), async (query) => {
        const asked: SearchQuery = { ...query, text: question };
        return content.search(asked);
      });

/** Whether a key in the cache is a reading of the reader's own making rather than a reading of the paper. */
export const isReaderKey = (key: readonly unknown[]): boolean => key[0] === ARTICLES && key[1] === SEARCH;

/** One article, body and all, under the key of its id. */
const one = (id: ArticleId) =>
  queryOptions({ queryKey: KEYS.one(id), queryFn: async (): Promise<Article> => content.getArticle(id) });

/**
 * The reading of one article: what the reading screen reads, and what the screen around it reads too when it has
 * something of its own to do with the article — both under this one key, so the article is asked for once. The type
 * is read off the factory, which is where the library writes it.
 */
export const articleQuery = (id: ArticleId): ReturnType<typeof one> => one(id);
